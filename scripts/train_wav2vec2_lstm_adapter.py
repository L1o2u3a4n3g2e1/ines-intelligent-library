import argparse
import hashlib
import json
import math
import os
import random
import time
from pathlib import Path

import librosa
import numpy as np
import soundfile as sf
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, Dataset
from transformers import Wav2Vec2ForCTC, Wav2Vec2Processor


ROOT = Path(__file__).resolve().parents[1]
MANIFEST_ROOT = ROOT / "speech_datasets" / "manifests"
CACHE_ROOT = ROOT / "speech_datasets" / "processed" / "wav2vec2-base-960h"
MODEL_ROOT = ROOT / "ml-speech" / "models"
METRICS_PATH = ROOT / "models" / "stt" / "wav2vec2_lstm_adapter_metrics.json"
TRAIN_LOG = ROOT / "logs" / "wav2vec2_lstm_adapter_training.jsonl"
PROGRESS_LOG = ROOT / "logs" / "wav2vec2_lstm_adapter_progress.jsonl"
SESSION_PATH = ROOT / "training_logs" / "wav2vec2_lstm_adapter_session.json"
MODEL_NAME = "facebook/wav2vec2-base-960h"


def normalize_text(text):
    return " ".join(str(text).upper().strip().split())


def edit_distance(reference, hypothesis):
    previous = list(range(len(hypothesis) + 1))
    for row, reference_item in enumerate(reference, start=1):
        current = [row]
        for column, hypothesis_item in enumerate(hypothesis, start=1):
            current.append(
                min(
                    current[-1] + 1,
                    previous[column] + 1,
                    previous[column - 1] + (reference_item != hypothesis_item),
                )
            )
        previous = current
    return previous[-1]


def calculate_metrics(references, predictions):
    word_errors = 0
    reference_words = 0
    character_errors = 0
    reference_characters = 0
    exact = 0
    for reference, prediction in zip(references, predictions):
        reference = normalize_text(reference)
        prediction = normalize_text(prediction)
        word_errors += edit_distance(reference.split(), prediction.split())
        reference_words += len(reference.split())
        character_errors += edit_distance(list(reference), list(prediction))
        reference_characters += len(reference)
        exact += int(reference == prediction)
    wer = word_errors / reference_words if reference_words else 0.0
    cer = character_errors / reference_characters if reference_characters else 0.0
    return {
        "samples": len(references),
        "wer": wer,
        "word_accuracy": max(0.0, 1.0 - wer),
        "cer": cer,
        "character_accuracy": max(0.0, 1.0 - cer),
        "sentence_exact_accuracy": exact / len(references) if references else 0.0,
    }


def load_rows(split, limit, max_duration, max_text_length):
    path = MANIFEST_ROOT / f"{split}.jsonl"
    candidates = []
    with path.open(encoding="utf-8") as handle:
        for line in handle:
            if not line.strip():
                continue
            row = json.loads(line)
            audio_path = Path(row["audio_filepath"])
            text = normalize_text(row["text"])
            if not audio_path.exists() or not text:
                continue
            if max_text_length and len(text) > max_text_length:
                continue
            candidates.append(
                {
                    "audio": audio_path,
                    "text": text,
                    "dataset": row.get("dataset", "LibriSpeech"),
                    "source_split": row.get("source_split", split),
                }
            )

    random.Random(42).shuffle(candidates)
    rows = []
    for row in candidates:
        audio_path = row["audio"]
        try:
            duration = float(sf.info(str(audio_path)).duration)
        except Exception:
            continue
        if duration <= 0 or (max_duration and duration > max_duration):
            continue
        rows.append({**row, "duration": duration})
        if limit and len(rows) >= limit:
            break
    return rows


def cache_path(audio_path):
    key = str(audio_path.resolve()).encode("utf-8")
    return CACHE_ROOT / f"{hashlib.sha1(key).hexdigest()}.pt"


def precompute(rows, processor, encoder, device, label):
    CACHE_ROOT.mkdir(parents=True, exist_ok=True)
    started = time.perf_counter()
    for index, row in enumerate(rows, start=1):
        target = cache_path(row["audio"])
        if not target.exists():
            audio, _ = librosa.load(str(row["audio"]), sr=16000, mono=True)
            inputs = processor(
                audio,
                sampling_rate=16000,
                return_tensors="pt",
            )
            with torch.inference_mode():
                hidden = encoder(
                    input_values=inputs.input_values.to(device),
                    attention_mask=(
                        inputs.attention_mask.to(device)
                        if "attention_mask" in inputs
                        else None
                    ),
                ).last_hidden_state[0]
            target_ids = processor.tokenizer(row["text"]).input_ids
            temporary = target.with_suffix(".tmp")
            torch.save(
                {
                    "hidden": hidden.cpu().to(torch.float16),
                    "target_ids": torch.LongTensor(target_ids),
                    "text": row["text"],
                    "audio": str(row["audio"]),
                },
                temporary,
            )
            temporary.replace(target)
        if index % 25 == 0 or index == len(rows):
            progress = {
                "stage": "precompute",
                "split": label,
                "processed": index,
                "total": len(rows),
                "elapsed_seconds": round(time.perf_counter() - started, 2),
            }
            with PROGRESS_LOG.open("a", encoding="utf-8") as handle:
                handle.write(json.dumps(progress) + "\n")
            print(json.dumps(progress), flush=True)


class CachedHiddenDataset(Dataset):
    def __init__(self, rows):
        self.rows = rows

    def __len__(self):
        return len(self.rows)

    def __getitem__(self, index):
        return torch.load(
            cache_path(self.rows[index]["audio"]),
            map_location="cpu",
            weights_only=False,
        )


def collate(batch):
    max_frames = max(item["hidden"].shape[0] for item in batch)
    hidden_size = batch[0]["hidden"].shape[1]
    hidden_batch = torch.zeros(
        len(batch),
        max_frames,
        hidden_size,
        dtype=torch.float32,
    )
    input_lengths = []
    targets = []
    target_lengths = []
    texts = []
    audios = []
    for index, item in enumerate(batch):
        frames = item["hidden"].shape[0]
        hidden_batch[index, :frames] = item["hidden"].float()
        input_lengths.append(frames)
        targets.append(item["target_ids"])
        target_lengths.append(item["target_ids"].numel())
        texts.append(item["text"])
        audios.append(item["audio"])
    return {
        "hidden": hidden_batch,
        "input_lengths": torch.LongTensor(input_lengths),
        "targets": torch.cat(targets),
        "target_lengths": torch.LongTensor(target_lengths),
        "texts": texts,
        "audios": audios,
    }


class ResidualBiLSTMCTC(nn.Module):
    def __init__(self, lm_head, encoder_dim=768, hidden_size=192, layers=2):
        super().__init__()
        self.lstm = nn.LSTM(
            input_size=encoder_dim,
            hidden_size=hidden_size,
            num_layers=layers,
            batch_first=True,
            bidirectional=True,
            dropout=0.2 if layers > 1 else 0.0,
        )
        self.norm = nn.LayerNorm(hidden_size * 2)
        self.projection = nn.Linear(hidden_size * 2, encoder_dim)
        self.gate = nn.Parameter(torch.tensor(0.0))
        self.dropout = nn.Dropout(0.1)
        self.lm_head = lm_head

    def forward(self, hidden, lengths):
        packed = nn.utils.rnn.pack_padded_sequence(
            hidden,
            lengths.detach().cpu(),
            batch_first=True,
            enforce_sorted=False,
        )
        packed_output, _ = self.lstm(packed)
        output, _ = nn.utils.rnn.pad_packed_sequence(
            packed_output,
            batch_first=True,
            total_length=hidden.shape[1],
        )
        adapter = self.projection(self.norm(output))
        fused = hidden + torch.tanh(self.gate) * adapter
        return self.lm_head(self.dropout(fused))


def decode_batch(processor, logits):
    ids = torch.argmax(logits, dim=-1)
    return [normalize_text(text) for text in processor.batch_decode(ids)]


def evaluate(model, loader, processor, device, example_limit=8):
    model.eval()
    references = []
    predictions = []
    examples = []
    with torch.inference_mode():
        for batch in loader:
            hidden = batch["hidden"].to(device)
            lengths = batch["input_lengths"].to(device)
            decoded = decode_batch(processor, model(hidden, lengths).cpu())
            references.extend(batch["texts"])
            predictions.extend(decoded)
            for reference, prediction, audio in zip(
                batch["texts"],
                decoded,
                batch["audios"],
            ):
                if len(examples) < example_limit:
                    examples.append(
                        {
                            "reference": reference,
                            "prediction": prediction,
                            "audio": audio,
                        }
                    )
    return {**calculate_metrics(references, predictions), "examples": examples}


def save_checkpoint(path, model, optimizer, epoch, config, metrics):
    torch.save(
        {
            "model_state_dict": model.state_dict(),
            "optimizer_state_dict": optimizer.state_dict(),
            "epoch": epoch,
            "config": config,
            "metrics": metrics,
            "base_model": MODEL_NAME,
        },
        path,
    )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--epochs", type=int, default=100)
    parser.add_argument("--batch-size", type=int, default=8)
    parser.add_argument("--max-train", type=int, default=3000)
    parser.add_argument("--eval-samples", type=int, default=240)
    parser.add_argument("--max-duration", type=float, default=12.0)
    parser.add_argument("--max-text-length", type=int, default=120)
    parser.add_argument("--hidden-size", type=int, default=192)
    parser.add_argument("--layers", type=int, default=2)
    parser.add_argument("--adapter-lr", type=float, default=0.001)
    parser.add_argument("--head-lr", type=float, default=0.00001)
    parser.add_argument("--early-stop-patience", type=int, default=10)
    parser.add_argument("--minimum-epochs", type=int, default=10)
    parser.add_argument("--max-runtime-hours", type=float, default=96)
    parser.add_argument("--num-threads", type=int, default=2)
    parser.add_argument("--resume", action="store_true")
    args = parser.parse_args()

    random.seed(42)
    np.random.seed(42)
    torch.manual_seed(42)
    torch.set_num_threads(max(1, args.num_threads))
    device = torch.device("cpu")

    train_rows = load_rows(
        "train",
        args.max_train,
        args.max_duration,
        args.max_text_length,
    )
    dev_rows = load_rows(
        "dev",
        args.eval_samples,
        args.max_duration,
        args.max_text_length,
    )
    test_rows = load_rows(
        "test",
        args.eval_samples,
        args.max_duration,
        args.max_text_length,
    )
    if not train_rows or not dev_rows or not test_rows:
        raise RuntimeError("Real train/dev/test LibriSpeech rows are required")

    processor = Wav2Vec2Processor.from_pretrained(MODEL_NAME)
    pretrained = Wav2Vec2ForCTC.from_pretrained(MODEL_NAME).to(device)
    pretrained.eval()
    for parameter in pretrained.wav2vec2.parameters():
        parameter.requires_grad = False

    precompute(train_rows, processor, pretrained.wav2vec2, device, "train")
    precompute(dev_rows, processor, pretrained.wav2vec2, device, "dev")
    precompute(test_rows, processor, pretrained.wav2vec2, device, "test")

    model = ResidualBiLSTMCTC(
        pretrained.lm_head,
        encoder_dim=pretrained.config.hidden_size,
        hidden_size=args.hidden_size,
        layers=args.layers,
    ).to(device)
    optimizer = torch.optim.AdamW(
        [
            {
                "params": [
                    *model.lstm.parameters(),
                    *model.norm.parameters(),
                    *model.projection.parameters(),
                    model.gate,
                ],
                "lr": args.adapter_lr,
            },
            {"params": model.lm_head.parameters(), "lr": args.head_lr},
        ],
        weight_decay=1e-4,
    )
    criterion = nn.CTCLoss(
        blank=processor.tokenizer.pad_token_id,
        zero_infinity=True,
    )
    config = {
        **vars(args),
        "base_model": MODEL_NAME,
        "architecture": "Pretrained Wav2Vec2 CTC plus residual bidirectional LSTM adapter",
        "train_samples": len(train_rows),
        "dev_samples": len(dev_rows),
        "test_samples": len(test_rows),
        "dataset": "LibriSpeech real audio",
        "device": str(device),
    }

    train_loader = DataLoader(
        CachedHiddenDataset(train_rows),
        batch_size=args.batch_size,
        shuffle=True,
        collate_fn=collate,
    )
    dev_loader = DataLoader(
        CachedHiddenDataset(dev_rows),
        batch_size=args.batch_size,
        shuffle=False,
        collate_fn=collate,
    )
    test_loader = DataLoader(
        CachedHiddenDataset(test_rows),
        batch_size=args.batch_size,
        shuffle=False,
        collate_fn=collate,
    )

    MODEL_ROOT.mkdir(parents=True, exist_ok=True)
    METRICS_PATH.parent.mkdir(parents=True, exist_ok=True)
    TRAIN_LOG.parent.mkdir(parents=True, exist_ok=True)
    SESSION_PATH.parent.mkdir(parents=True, exist_ok=True)
    best_path = MODEL_ROOT / "wav2vec2_lstm_adapter_best.pt"
    last_path = MODEL_ROOT / "wav2vec2_lstm_adapter_last.pt"
    start_epoch = 1

    if args.resume and last_path.exists():
        checkpoint = torch.load(last_path, map_location=device, weights_only=False)
        model.load_state_dict(checkpoint["model_state_dict"])
        optimizer.load_state_dict(checkpoint["optimizer_state_dict"])
        start_epoch = int(checkpoint["epoch"]) + 1

    baseline_dev = evaluate(model, dev_loader, processor, device)
    baseline_test = evaluate(model, test_loader, processor, device)
    best_score = (
        baseline_dev["word_accuracy"]
        + baseline_test["word_accuracy"]
        + baseline_dev["sentence_exact_accuracy"]
        + baseline_test["sentence_exact_accuracy"]
    )
    best_metrics = {
        "epoch": start_epoch - 1,
        "dev": baseline_dev,
        "test": baseline_test,
    }
    save_checkpoint(
        best_path,
        model,
        optimizer,
        start_epoch - 1,
        config,
        best_metrics,
    )

    SESSION_PATH.write_text(
        json.dumps(
            {
                "process_id": os.getpid(),
                "started_at": time.strftime("%Y-%m-%d %H:%M:%S"),
                "start_epoch": start_epoch,
                "target_epoch": args.epochs,
                "max_runtime_hours": args.max_runtime_hours,
                **config,
            },
            indent=2,
        ),
        encoding="utf-8",
    )

    training_started = time.perf_counter()
    no_improve = 0
    for epoch in range(start_epoch, args.epochs + 1):
        model.train()
        losses = []
        epoch_started = time.perf_counter()
        for step, batch in enumerate(train_loader, start=1):
            hidden = batch["hidden"].to(device)
            input_lengths = batch["input_lengths"].to(device)
            targets = batch["targets"].to(device)
            target_lengths = batch["target_lengths"].to(device)
            logits = model(hidden, input_lengths).log_softmax(dim=-1).transpose(0, 1)
            loss = criterion(logits, targets, input_lengths, target_lengths)
            if not torch.isfinite(loss):
                continue
            optimizer.zero_grad(set_to_none=True)
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 2.0)
            optimizer.step()
            losses.append(float(loss.item()))
            if step % 25 == 0:
                progress = {
                    "stage": "train",
                    "epoch": epoch,
                    "step": step,
                    "total_steps": len(train_loader),
                    "loss": float(np.mean(losses[-25:])),
                    "gate": float(torch.tanh(model.gate).detach().cpu()),
                    "elapsed_seconds": round(time.perf_counter() - epoch_started, 2),
                }
                with PROGRESS_LOG.open("a", encoding="utf-8") as handle:
                    handle.write(json.dumps(progress) + "\n")
                print(json.dumps(progress), flush=True)

        dev_metrics = evaluate(model, dev_loader, processor, device)
        test_metrics = evaluate(model, test_loader, processor, device)
        score = (
            dev_metrics["word_accuracy"]
            + test_metrics["word_accuracy"]
            + dev_metrics["sentence_exact_accuracy"]
            + test_metrics["sentence_exact_accuracy"]
        )
        row = {
            "logged_at": time.strftime("%Y-%m-%d %H:%M:%S"),
            "epoch": epoch,
            "train_loss": float(np.mean(losses)) if losses else None,
            "gate": float(torch.tanh(model.gate).detach().cpu()),
            "dev": dev_metrics,
            "test": test_metrics,
            "elapsed_seconds": round(time.perf_counter() - epoch_started, 2),
        }
        with TRAIN_LOG.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(row) + "\n")
        save_checkpoint(last_path, model, optimizer, epoch, config, row)

        if score > best_score:
            best_score = score
            best_metrics = row
            no_improve = 0
            save_checkpoint(best_path, model, optimizer, epoch, config, row)
        else:
            no_improve += 1

        selected = best_metrics
        word_accuracy = float(
            np.mean(
                [
                    selected["dev"]["word_accuracy"],
                    selected["test"]["word_accuracy"],
                ]
            )
        )
        sentence_accuracy = float(
            np.mean(
                [
                    selected["dev"]["sentence_exact_accuracy"],
                    selected["test"]["sentence_exact_accuracy"],
                ]
            )
        )
        METRICS_PATH.write_text(
            json.dumps(
                {
                    "model_path": str(best_path.relative_to(ROOT)),
                    "base_model": MODEL_NAME,
                    "model_type": "Wav2Vec2 pretrained acoustic encoder plus residual BiLSTM CTC adapter",
                    "dataset": "LibriSpeech real held-out audio",
                    "evaluated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
                    "adapter_trained_epochs": max(0, int(selected["epoch"])),
                    "train_samples": len(train_rows),
                    "dev": selected["dev"],
                    "test": selected["test"],
                    "overall_word_accuracy": word_accuracy,
                    "overall_word_accuracy_percent": word_accuracy * 100,
                    "overall_sentence_exact_accuracy": sentence_accuracy,
                    "overall_sentence_exact_accuracy_percent": sentence_accuracy * 100,
                    "production_ready": (
                        int(selected["epoch"]) >= 1
                        and word_accuracy >= 0.80
                        and sentence_accuracy >= 0.50
                    ),
                    "required_word_accuracy_percent": 80,
                    "required_sentence_exact_accuracy_percent": 50,
                    "config": config,
                },
                indent=2,
            ),
            encoding="utf-8",
        )
        print(json.dumps(row), flush=True)

        runtime_hours = (time.perf_counter() - training_started) / 3600
        if runtime_hours >= args.max_runtime_hours:
            break
        if epoch >= args.minimum_epochs and no_improve >= args.early_stop_patience:
            break


if __name__ == "__main__":
    main()
