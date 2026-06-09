import argparse
from contextlib import nullcontext
import hashlib
import json
import math
import os
import random
import sys
import time
from collections import Counter
from pathlib import Path

import librosa
import numpy as np
import soundfile as sf
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, Dataset


ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from ml.common.metrics_cpu import SpeechMetricsCalculator, character_error_rate, normalize_text, sentence_accuracy, word_error_rate
from ml.common.metrics_logger import TrainingMetricsLogger


DATASET_ROOT = ROOT / "speech_datasets" / "LibriSpeech"
MANIFEST_ROOT = ROOT / "speech_datasets" / "manifests"
MODEL_DIR = ROOT / "ml-speech" / "models"
METRICS_PATH = ROOT / "models" / "stt" / "english_lstm_real_eval.json"
TRAIN_LOG = ROOT / "logs" / "english_lstm_ctc_training.jsonl"
PROGRESS_LOG = ROOT / "logs" / "english_lstm_ctc_progress.jsonl"
CPU_METRICS_DIR = ROOT / "training_logs"
FEATURE_CACHE_DIR = ROOT / "speech_datasets" / "processed" / "features"
SESSION_PATH = ROOT / "training_logs" / "lstm_ctc_session.json"

SAMPLE_RATE = 16000
N_MFCC = 13
INPUT_SIZE = 26
HOP_LENGTH = 160
N_FFT = 400
HIDDEN_SIZE = 256
LSTM_LAYERS = 3
BLANK = 0
CHARS = ["<blank>"] + list(" ABCDEFGHIJKLMNOPQRSTUVWXYZ'.-")
CHAR_TO_IDX = {char: idx for idx, char in enumerate(CHARS)}
IDX_TO_CHAR = {idx: char for char, idx in CHAR_TO_IDX.items()}


def clean_text(text):
    allowed = set(CHARS[1:])
    return "".join(ch for ch in normalize_text(text) if ch in allowed).strip()


def load_librispeech_split(split, limit=None, max_duration=12.0, shuffle=True):
    samples = []
    split_dir = DATASET_ROOT / split
    for trans_file in sorted(split_dir.rglob("*.trans.txt")):
        with trans_file.open("r", encoding="utf-8") as handle:
            for line in handle:
                parts = line.strip().split(" ", 1)
                if len(parts) != 2:
                    continue
                file_id, transcript = parts
                audio_path = trans_file.parent / f"{file_id}.flac"
                if not audio_path.exists():
                    continue
                text = clean_text(transcript)
                if not text:
                    continue
                try:
                    duration = float(sf.info(str(audio_path)).duration)
                except Exception:
                    continue
                if duration <= 0 or duration > max_duration:
                    continue
                estimated_frames = max(1, math.ceil(duration * SAMPLE_RATE / HOP_LENGTH))
                if len(text) >= estimated_frames:
                    continue
                samples.append({"audio": audio_path, "text": text, "duration": duration})
                if limit and not shuffle and len(samples) >= limit:
                    return samples
    if shuffle:
        random.Random(42).shuffle(samples)
    return samples[:limit] if limit else samples


def valid_sample(audio_path, text, max_duration):
    text = clean_text(text)
    if not audio_path.exists() or not text:
        return None
    if max_duration <= 0:
        return {"audio": audio_path, "text": text, "duration": 0.0}
    try:
        duration = float(sf.info(str(audio_path)).duration)
    except Exception:
        return None
    if duration <= 0 or duration > max_duration:
        return None
    estimated_frames = max(1, math.ceil(duration * SAMPLE_RATE / HOP_LENGTH))
    if len(text) >= estimated_frames:
        return None
    return {"audio": audio_path, "text": text, "duration": duration}


def load_manifest_split(split, limit=None, max_duration=12.0, shuffle=True, manifest_root=MANIFEST_ROOT, max_text_length=0):
    path = Path(manifest_root) / f"{split}.jsonl"
    if not path.exists():
        return []
    samples = []
    with path.open("r", encoding="utf-8") as handle:
        for line in handle:
            if not line.strip():
                continue
            try:
                row = json.loads(line)
            except json.JSONDecodeError:
                continue
            audio_value = row.get("audio_filepath") or row.get("audio")
            if not audio_value:
                continue
            text_value = clean_text(row.get("text", ""))
            if max_text_length and len(text_value) > max_text_length:
                continue
            sample = valid_sample(Path(audio_value), text_value, max_duration)
            if sample:
                sample["dataset"] = row.get("dataset", "manifest")
                sample["source_split"] = row.get("source_split", split)
                samples.append(sample)
                if limit and not shuffle and len(samples) >= limit:
                    return samples
    if shuffle:
        random.Random(42).shuffle(samples)
    return samples[:limit] if limit else samples


def load_split(split, fallback_librispeech_split, limit=None, max_duration=12.0, shuffle=True, manifest_root=MANIFEST_ROOT, max_text_length=0):
    manifest_samples = load_manifest_split(split, limit, max_duration, shuffle, manifest_root, max_text_length)
    if manifest_samples:
        return manifest_samples
    return load_librispeech_split(fallback_librispeech_split, limit, max_duration, shuffle)


class LibriSpeechCTCDataset(Dataset):
    def __init__(self, samples, cache_dir=None):
        self.samples = samples
        self.cache_dir = Path(cache_dir) if cache_dir else None
        if self.cache_dir:
            self.cache_dir.mkdir(parents=True, exist_ok=True)

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, index):
        sample = self.samples[index]
        features = self.load_or_extract_features(sample["audio"])
        target = torch.LongTensor([CHAR_TO_IDX[ch] for ch in sample["text"]])
        return {
            "features": features,
            "target": target,
            "text": sample["text"],
            "path": str(sample["audio"]),
        }

    def cache_path(self, audio_path):
        if not self.cache_dir:
            return None
        audio_path = Path(audio_path)
        stat = audio_path.stat()
        key = f"{audio_path.resolve()}::{stat.st_size}::{int(stat.st_mtime)}"
        return self.cache_dir / f"{hashlib.sha1(key.encode('utf-8')).hexdigest()}.pt"

    def load_or_extract_features(self, audio_path):
        cache_path = self.cache_path(audio_path)
        if cache_path and cache_path.exists():
            return torch.load(cache_path, map_location="cpu", weights_only=False)
        audio, _ = librosa.load(str(audio_path), sr=SAMPLE_RATE, mono=True)
        features = extract_features_from_audio(audio)
        if cache_path:
            tmp_path = cache_path.with_suffix(".tmp")
            torch.save(features, tmp_path)
            tmp_path.replace(cache_path)
        return features


def extract_features_from_audio(audio):
    audio = audio.astype(np.float32)
    mfcc = librosa.feature.mfcc(
        y=audio,
        sr=SAMPLE_RATE,
        n_mfcc=N_MFCC,
        n_fft=N_FFT,
        hop_length=HOP_LENGTH,
    )
    delta = librosa.feature.delta(mfcc)
    features = np.vstack([mfcc, delta]).T.astype(np.float32)
    features = (features - features.mean()) / (features.std() + 1e-8)
    return torch.FloatTensor(features)


def collate(batch):
    batch = [item for item in batch if item["target"].numel() > 0 and item["features"].shape[0] > item["target"].numel()]
    if not batch:
        return None
    max_frames = max(item["features"].shape[0] for item in batch)
    feature_batch = []
    input_lengths = []
    targets = []
    target_lengths = []
    texts = []
    paths = []
    for item in batch:
        features = item["features"]
        input_lengths.append(features.shape[0])
        if features.shape[0] < max_frames:
            features = torch.nn.functional.pad(features, (0, 0, 0, max_frames - features.shape[0]))
        feature_batch.append(features)
        targets.append(item["target"])
        target_lengths.append(item["target"].numel())
        texts.append(item["text"])
        paths.append(item["path"])
    return {
        "features": torch.stack(feature_batch),
        "input_lengths": torch.LongTensor(input_lengths),
        "targets": torch.cat(targets),
        "target_lengths": torch.LongTensor(target_lengths),
        "texts": texts,
        "paths": paths,
    }


def precompute_feature_cache(samples, cache_dir, progress_every=250):
    dataset = LibriSpeechCTCDataset(samples, cache_dir=cache_dir)
    started = time.perf_counter()
    cached = 0
    for index in range(len(dataset)):
        dataset.load_or_extract_features(dataset.samples[index]["audio"])
        cached += 1
        if progress_every and cached % progress_every == 0:
            print(json.dumps({
                "precompute_features": {
                    "cached": cached,
                    "total": len(dataset),
                    "elapsed_seconds": round(time.perf_counter() - started, 2),
                }
            }), flush=True)
    return cached


class EnglishLSTMCTC(nn.Module):
    def __init__(self, input_size=INPUT_SIZE, hidden_size=HIDDEN_SIZE, layers=LSTM_LAYERS, vocab_size=len(CHARS)):
        super().__init__()
        self.hidden_size = hidden_size
        self.lstm = nn.LSTM(
            input_size=input_size,
            hidden_size=hidden_size,
            num_layers=layers,
            batch_first=True,
            bidirectional=True,
            dropout=0.25 if layers > 1 else 0.0,
        )
        self.norm = nn.LayerNorm(hidden_size * 2)
        self.attention = nn.Linear(hidden_size * 2, 1)
        self.fc = nn.Linear(hidden_size * 2, vocab_size)

    def forward(self, x, lengths=None):
        if lengths is not None:
            packed = nn.utils.rnn.pack_padded_sequence(
                x,
                lengths.detach().cpu(),
                batch_first=True,
                enforce_sorted=False,
            )
            packed_output, _ = self.lstm(packed)
            output, _ = nn.utils.rnn.pad_packed_sequence(
                packed_output,
                batch_first=True,
                total_length=x.size(1),
            )
        else:
            output, _ = self.lstm(x)
        output = self.norm(output)
        attention_weights = torch.softmax(self.attention(output), dim=1)
        output = output + (output * attention_weights)
        return self.fc(output)


def decode(logits):
    indices = torch.argmax(logits, dim=-1).detach().cpu().tolist()
    text = []
    previous = None
    for idx in indices:
        if idx != BLANK and idx != previous:
            text.append(IDX_TO_CHAR[idx])
        previous = idx
    return "".join(text).strip()


def word_overlap_metrics(references, predictions):
    true_positive = 0
    predicted_total = 0
    reference_total = 0
    for reference, prediction in zip(references, predictions):
        reference_counts = Counter(reference.split())
        prediction_counts = Counter(prediction.split())
        true_positive += sum((reference_counts & prediction_counts).values())
        predicted_total += sum(prediction_counts.values())
        reference_total += sum(reference_counts.values())
    precision = true_positive / predicted_total if predicted_total else 0.0
    recall = true_positive / reference_total if reference_total else 0.0
    f1 = (2 * precision * recall / (precision + recall)) if precision + recall else 0.0
    return {
        "word_precision": precision,
        "word_recall": recall,
        "word_f1": f1,
    }


def evaluate(model, samples, device, limit=100, cache_dir=None):
    model.eval()
    subset = samples[:limit]
    predictions = []
    references = []
    examples = []
    dataset = LibriSpeechCTCDataset(subset, cache_dir=cache_dir)
    loader = DataLoader(dataset, batch_size=1, shuffle=False, collate_fn=collate)
    with torch.no_grad():
        for batch in loader:
            if batch is None:
                continue
            features = batch["features"].to(device)
            input_lengths = batch["input_lengths"].to(device)
            logits = model(features, input_lengths)[0]
            prediction = decode(logits)
            reference = batch["texts"][0]
            predictions.append(prediction)
            references.append(reference)
            if len(examples) < 8:
                examples.append({"reference": reference, "prediction": prediction})
    aggregate = SpeechMetricsCalculator()
    aggregate.update_many(references, predictions)
    cpu_metrics = aggregate.get_metrics()
    return {
        "samples": len(references),
        "wer": cpu_metrics["wer"],
        "cer": cpu_metrics["cer"],
        "sentence_accuracy": cpu_metrics["sentence_accuracy"],
        "word_accuracy": max(0.0, 1.0 - cpu_metrics["wer"]),
        "character_accuracy": max(0.0, 1.0 - cpu_metrics["cer"]),
        **word_overlap_metrics(references, predictions),
        "examples": examples,
    }


def save_checkpoint(path, model, optimizer, epoch, best_accuracy, config, best_cer=None, scheduler=None, no_improve_epochs=0):
    torch.save({
        "model_state_dict": model.state_dict(),
        "optimizer_state_dict": optimizer.state_dict(),
        "scheduler_state_dict": scheduler.state_dict() if scheduler is not None else None,
        "epoch": epoch,
        "best_accuracy": best_accuracy,
        "best_cer": best_cer,
        "no_improve_epochs": no_improve_epochs,
        "config": config,
        "chars": CHARS,
    }, path)


def write_metrics(model_path, dev_metrics, test_metrics, target_accuracy):
    overall = float(np.mean([dev_metrics["word_accuracy"], test_metrics["word_accuracy"]]))
    payload = {
        "model_path": str(model_path.relative_to(ROOT)),
        "task": "English speech-to-text using LSTM-CTC",
        "dataset": "LibriSpeech real held-out audio",
        "evaluated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "sample_count": dev_metrics["samples"] + test_metrics["samples"],
        "splits": [
            {"split": "dev-clean", **dev_metrics},
            {"split": "test-clean", **test_metrics},
        ],
        "overall_word_accuracy": overall,
        "overall_word_accuracy_percent": overall * 100,
        "overall_sentence_accuracy": float(np.mean([dev_metrics["sentence_accuracy"], test_metrics["sentence_accuracy"]])),
        "overall_cer": float(np.mean([dev_metrics["cer"], test_metrics["cer"]])),
        "overall_wer": float(np.mean([dev_metrics["wer"], test_metrics["wer"]])),
        "target_word_accuracy_percent": target_accuracy * 100,
        "target_met": overall >= target_accuracy,
        "verdict": "ready" if overall >= target_accuracy else "needs_more_training",
    }
    METRICS_PATH.parent.mkdir(parents=True, exist_ok=True)
    METRICS_PATH.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return payload


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--epochs", type=int, default=100)
    parser.add_argument("--batch-size", type=int, default=8)
    parser.add_argument("--lr", type=float, default=3e-4)
    parser.add_argument("--max-train", type=int, default=0)
    parser.add_argument("--max-duration", type=float, default=12.0)
    parser.add_argument("--eval-samples", type=int, default=100)
    parser.add_argument("--target-accuracy", type=float, default=0.75)
    parser.add_argument("--progress-every", type=int, default=50)
    parser.add_argument("--manifest-root", default=str(MANIFEST_ROOT))
    parser.add_argument("--grad-accum-steps", type=int, default=4)
    parser.add_argument("--early-stop-patience", type=int, default=12)
    parser.add_argument("--min-delta", type=float, default=0.001)
    parser.add_argument("--hidden-size", type=int, default=HIDDEN_SIZE)
    parser.add_argument("--layers", type=int, default=LSTM_LAYERS)
    parser.add_argument("--precompute-features", action="store_true")
    parser.add_argument("--cache-features", action="store_true")
    parser.add_argument("--curriculum-short-first", action="store_true")
    parser.add_argument("--max-text-length", type=int, default=0)
    parser.add_argument("--amp", action="store_true")
    parser.add_argument("--resume", action="store_true")
    parser.add_argument("--max-runtime-minutes", type=float, default=0)
    parser.add_argument("--num-threads", type=int, default=0)
    args = parser.parse_args()

    random.seed(42)
    np.random.seed(42)
    torch.manual_seed(42)
    if args.num_threads:
        torch.set_num_threads(max(1, args.num_threads))

    device = torch.device("cpu")
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    TRAIN_LOG.parent.mkdir(parents=True, exist_ok=True)

    manifest_root = Path(args.manifest_root)
    train_limit = None if args.curriculum_short_first else (args.max_train or None)
    train_shuffle_for_loading = False if args.max_train and not args.curriculum_short_first else True
    train_samples = load_split("train", "train-clean-100", train_limit, args.max_duration, train_shuffle_for_loading, manifest_root, args.max_text_length)
    dev_samples = load_split("dev", "dev-clean", None, args.max_duration, False, manifest_root, args.max_text_length)
    test_samples = load_split("test", "test-clean", None, args.max_duration, False, manifest_root, args.max_text_length)
    if args.curriculum_short_first:
        train_samples = sorted(train_samples, key=lambda sample: (sample["duration"], len(sample["text"])))
        if args.max_train:
            train_samples = train_samples[:args.max_train]
    if not train_samples:
        raise RuntimeError("No real training samples found. Download training data and rebuild manifests before training.")
    if not dev_samples or not test_samples:
        raise RuntimeError("Dev/test manifests must contain real held-out samples before training.")

    config = vars(args) | {
        "sample_rate": SAMPLE_RATE,
        "n_mfcc": N_MFCC,
        "input_size": INPUT_SIZE,
        "feature_type": "MFCC plus delta",
        "architecture": "Bidirectional LSTM with temporal attention gate and CTC loss",
        "batching": "pad_sequence plus pack_padded_sequence",
        "hidden_size": args.hidden_size,
        "layers": args.layers,
        "chars": CHARS,
        "train_samples": len(train_samples),
        "dev_samples": len(dev_samples),
        "test_samples": len(test_samples),
        "manifest_root": str(manifest_root),
        "train_manifest": str(manifest_root / "train.jsonl"),
        "dev_manifest": str(manifest_root / "dev.jsonl"),
        "test_manifest": str(manifest_root / "test.jsonl"),
        "device": str(device),
    }

    feature_cache_dir = FEATURE_CACHE_DIR if (args.cache_features or args.precompute_features) else None
    if args.precompute_features:
        precompute_feature_cache(train_samples, FEATURE_CACHE_DIR)

    model = EnglishLSTMCTC(hidden_size=args.hidden_size, layers=args.layers).to(device)
    optimizer = torch.optim.AdamW(model.parameters(), lr=args.lr, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode="min", factor=0.5, patience=3)
    criterion = nn.CTCLoss(blank=BLANK, zero_infinity=True)
    use_amp = bool(args.amp and device.type == "cuda")
    scaler = torch.amp.GradScaler("cuda") if use_amp else None
    best_path = MODEL_DIR / "english_lstm_ctc_best.pt"
    last_path = MODEL_DIR / "english_lstm_ctc_last.pt"
    start_epoch = 1
    best_accuracy = 0.0
    best_cer = float("inf")
    no_improve_epochs = 0
    metrics_logger = TrainingMetricsLogger(CPU_METRICS_DIR)

    if args.resume and last_path.exists():
        checkpoint = torch.load(last_path, map_location=device)
        try:
            model.load_state_dict(checkpoint["model_state_dict"])
            optimizer.load_state_dict(checkpoint["optimizer_state_dict"])
            if checkpoint.get("scheduler_state_dict"):
                scheduler.load_state_dict(checkpoint["scheduler_state_dict"])
            start_epoch = int(checkpoint["epoch"]) + 1
            best_accuracy = float(checkpoint.get("best_accuracy", 0.0))
            best_cer = float(checkpoint.get("best_cer", float("inf")))
            no_improve_epochs = int(checkpoint.get("no_improve_epochs", 0))
            if best_path.exists():
                best_checkpoint = torch.load(best_path, map_location="cpu")
                best_accuracy = max(best_accuracy, float(best_checkpoint.get("best_accuracy", 0.0)))
                best_cer = min(best_cer, float(best_checkpoint.get("best_cer", float("inf"))))
            print(json.dumps({
                "resume": True,
                "checkpoint_epoch": int(checkpoint["epoch"]),
                "start_epoch": start_epoch,
                "best_accuracy": best_accuracy,
                "best_cer": best_cer,
            }), flush=True)
        except RuntimeError as exc:
            print(json.dumps({
                "resume_skipped": True,
                "reason": "checkpoint architecture is incompatible with current CPU LSTM-CTC model",
                "checkpoint": str(last_path),
                "error": str(exc).splitlines()[0],
            }), flush=True)

    SESSION_PATH.parent.mkdir(parents=True, exist_ok=True)
    SESSION_PATH.write_text(json.dumps({
        "process_id": os.getpid(),
        "started_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "resumed_checkpoint_epoch": start_epoch - 1,
        "start_epoch": start_epoch,
        "target_epoch": args.epochs,
        "max_runtime_minutes": args.max_runtime_minutes,
        "training_samples": len(train_samples),
        "development_samples": len(dev_samples),
        "test_samples": len(test_samples),
        "num_threads": torch.get_num_threads(),
        "device": str(device),
    }, indent=2), encoding="utf-8")

    train_loader = DataLoader(
        LibriSpeechCTCDataset(train_samples),
        batch_size=args.batch_size,
        shuffle=True,
        collate_fn=collate,
        num_workers=0,
    )
    if feature_cache_dir:
        train_loader = DataLoader(
            LibriSpeechCTCDataset(train_samples, cache_dir=feature_cache_dir),
            batch_size=args.batch_size,
            shuffle=True,
            collate_fn=collate,
            num_workers=0,
        )

    training_started = time.perf_counter()
    for epoch in range(start_epoch, args.epochs + 1):
        model.train()
        losses = []
        started = time.perf_counter()
        total_steps = len(train_loader)
        optimizer.zero_grad(set_to_none=True)
        for step, batch in enumerate(train_loader, start=1):
            if batch is None:
                continue
            features = batch["features"].to(device)
            targets = batch["targets"].to(device)
            input_lengths = batch["input_lengths"].to(device)
            target_lengths = batch["target_lengths"].to(device)

            amp_context = torch.amp.autocast("cuda") if use_amp else nullcontext()
            with amp_context:
                logits = model(features, input_lengths).log_softmax(dim=-1).transpose(0, 1)
                loss = criterion(logits, targets, input_lengths, target_lengths)
            if not torch.isfinite(loss):
                continue
            scaled_loss = loss / max(1, args.grad_accum_steps)
            if scaler is not None:
                scaler.scale(scaled_loss).backward()
            else:
                scaled_loss.backward()
            if step % max(1, args.grad_accum_steps) == 0 or step == total_steps:
                if scaler is not None:
                    scaler.unscale_(optimizer)
                torch.nn.utils.clip_grad_norm_(model.parameters(), 2.0)
                if scaler is not None:
                    scaler.step(optimizer)
                    scaler.update()
                else:
                    optimizer.step()
                optimizer.zero_grad(set_to_none=True)
            losses.append(float(loss.item()))
            if args.progress_every and step % args.progress_every == 0:
                progress = {
                    "logged_at": time.strftime("%Y-%m-%d %H:%M:%S"),
                    "epoch": epoch,
                    "step": step,
                    "total_steps": total_steps,
                    "loss": float(np.mean(losses[-args.progress_every:])),
                    "learning_rate": optimizer.param_groups[0]["lr"],
                    "elapsed_seconds": round(time.perf_counter() - started, 2),
                }
                with PROGRESS_LOG.open("a", encoding="utf-8") as handle:
                    handle.write(json.dumps(progress) + "\n")
                print(json.dumps({"progress": progress}), flush=True)

        dev_metrics = evaluate(model, dev_samples, device, args.eval_samples, feature_cache_dir)
        test_metrics = evaluate(model, test_samples, device, args.eval_samples, feature_cache_dir)
        overall_accuracy = float(np.mean([dev_metrics["word_accuracy"], test_metrics["word_accuracy"]]))
        scheduler.step(dev_metrics["cer"])
        row = {
            "logged_at": time.strftime("%Y-%m-%d %H:%M:%S"),
            "epoch": epoch,
            "loss": float(np.mean(losses)) if losses else None,
            "dev_word_accuracy": dev_metrics["word_accuracy"],
            "test_word_accuracy": test_metrics["word_accuracy"],
            "dev_sentence_accuracy": dev_metrics["sentence_accuracy"],
            "test_sentence_accuracy": test_metrics["sentence_accuracy"],
            "overall_word_accuracy": overall_accuracy,
            "dev_wer": dev_metrics["wer"],
            "test_wer": test_metrics["wer"],
            "dev_cer": dev_metrics["cer"],
            "test_cer": test_metrics["cer"],
            "dev_word_precision": dev_metrics["word_precision"],
            "test_word_precision": test_metrics["word_precision"],
            "dev_word_f1": dev_metrics["word_f1"],
            "test_word_f1": test_metrics["word_f1"],
            "learning_rate": optimizer.param_groups[0]["lr"],
            "elapsed_seconds": round(time.perf_counter() - started, 2),
        }
        with TRAIN_LOG.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(row) + "\n")
        metrics_logger.log_epoch(
            epoch=epoch,
            train_loss=row["loss"],
            val_loss=None,
            wer=dev_metrics["wer"],
            cer=dev_metrics["cer"],
            accuracy=dev_metrics["sentence_accuracy"],
            learning_rate=optimizer.param_groups[0]["lr"],
            extra={
                "test_wer": test_metrics["wer"],
                "test_cer": test_metrics["cer"],
                "test_sentence_accuracy": test_metrics["sentence_accuracy"],
                "overall_word_accuracy": overall_accuracy,
            },
        )

        improved = dev_metrics["cer"] < best_cer - args.min_delta
        if dev_metrics["cer"] < best_cer:
            best_cer = dev_metrics["cer"]
            best_accuracy = overall_accuracy
        if improved:
            no_improve_epochs = 0
        else:
            no_improve_epochs += 1
        if dev_metrics["cer"] <= best_cer:
            save_checkpoint(best_path, model, optimizer, epoch, best_accuracy, config, best_cer, scheduler, no_improve_epochs)
            write_metrics(best_path, dev_metrics, test_metrics, args.target_accuracy)
        save_checkpoint(last_path, model, optimizer, epoch, best_accuracy, config, best_cer, scheduler, no_improve_epochs)

        print(json.dumps(row), flush=True)
        if overall_accuracy >= args.target_accuracy:
            write_metrics(best_path, dev_metrics, test_metrics, args.target_accuracy)
            print("TARGET_REACHED", flush=True)
            break
        if args.early_stop_patience and no_improve_epochs >= args.early_stop_patience:
            print(json.dumps({"early_stopping": True, "epoch": epoch, "best_accuracy": best_accuracy}), flush=True)
            break
        if args.max_runtime_minutes:
            runtime_seconds = time.perf_counter() - training_started
            epoch_seconds = float(row["elapsed_seconds"])
            runtime_limit_seconds = args.max_runtime_minutes * 60
            if runtime_seconds >= runtime_limit_seconds or runtime_seconds + epoch_seconds > runtime_limit_seconds:
                print(json.dumps({
                    "runtime_limit_reached": True,
                    "epoch": epoch,
                    "runtime_seconds": round(runtime_seconds, 2),
                    "limit_seconds": round(runtime_limit_seconds, 2),
                    "next_epoch_estimate_seconds": epoch_seconds,
                }), flush=True)
                break
        if device.type == "cuda":
            torch.cuda.empty_cache()


if __name__ == "__main__":
    main()
