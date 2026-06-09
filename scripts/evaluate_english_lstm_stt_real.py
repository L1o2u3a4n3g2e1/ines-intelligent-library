import json
import time
from collections import Counter
from pathlib import Path

import librosa
import numpy as np
import torch
import torch.nn as nn

import sys


ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from ml.common.metrics_cpu import SpeechMetricsCalculator, normalize_text


DATASET_ROOT = ROOT / "speech_datasets" / "LibriSpeech"
DEFAULT_MODEL_PATH = ROOT / "ml-speech" / "models" / "english_lstm_ctc_best.pt"
SAMPLE_RATE = 16000
N_MFCC = 13
MAX_DURATION = 4.0


class LSTM_CTC(nn.Module):
    def __init__(self, input_size=40, hidden_size=256, num_layers=2, vocab_size=29):
        super().__init__()
        self.lstm = nn.LSTM(
            input_size=input_size,
            hidden_size=hidden_size,
            num_layers=num_layers,
            batch_first=True,
            bidirectional=True,
            dropout=0.2 if num_layers > 1 else 0,
        )
        self.fc = nn.Linear(hidden_size * 2, vocab_size)

    def forward(self, x):
        lstm_out, _ = self.lstm(x)
        return self.fc(lstm_out)


class EnglishLSTMCTC(nn.Module):
    def __init__(self, input_size=26, hidden_size=256, num_layers=3, vocab_size=32):
        super().__init__()
        self.lstm = nn.LSTM(
            input_size=input_size,
            hidden_size=hidden_size,
            num_layers=num_layers,
            batch_first=True,
            bidirectional=True,
            dropout=0.25 if num_layers > 1 else 0,
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
            packed_out, _ = self.lstm(packed)
            lstm_out, _ = nn.utils.rnn.pad_packed_sequence(
                packed_out,
                batch_first=True,
                total_length=x.size(1),
            )
        else:
            lstm_out, _ = self.lstm(x)
        output = self.norm(lstm_out)
        attention_weights = torch.softmax(self.attention(output), dim=1)
        output = output + (output * attention_weights)
        return self.fc(output)


CHARS = ["<blank>"] + list(" ABCDEFGHIJKLMNOPQRSTUVWXYZ'.-")


def clean_text(text):
    return normalize_text(text)


def ctc_decode(logits, chars):
    probabilities = torch.softmax(logits, dim=-1)
    predicted_ids = torch.argmax(probabilities, dim=-1).detach().cpu().tolist()
    confidences = torch.max(probabilities, dim=-1).values.detach().cpu().numpy()
    output = []
    previous = None
    for idx in predicted_ids:
        if idx != 0 and idx != previous:
            output.append(chars[idx])
        previous = idx
    return "".join(output).strip(), float(np.mean(confidences)), float(np.max(confidences))


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


def load_samples(split, limit):
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
                if audio_path.exists():
                    samples.append({"audio": audio_path, "reference": clean_text(transcript)})
                    if limit and len(samples) >= limit:
                        return samples
    return samples


def extract_features(audio_path, max_duration=MAX_DURATION, pad_to_duration=True):
    audio, _ = librosa.load(str(audio_path), sr=SAMPLE_RATE, mono=True, duration=max_duration)
    if pad_to_duration:
        max_samples = int(SAMPLE_RATE * max_duration)
        if len(audio) > max_samples:
            audio = audio[:max_samples]
        elif len(audio) < max_samples:
            audio = np.pad(audio, (0, max_samples - len(audio)))
    mfcc = librosa.feature.mfcc(y=audio, sr=SAMPLE_RATE, n_mfcc=N_MFCC, n_fft=400, hop_length=160)
    delta = librosa.feature.delta(mfcc)
    features = np.vstack([mfcc, delta]).T.astype(np.float32)
    features = (features - features.mean()) / (features.std() + 1e-9)
    return torch.FloatTensor(features).unsqueeze(0)


def load_model(model_path):
    checkpoint = torch.load(model_path, map_location="cpu")
    state = checkpoint.get("model_state_dict", checkpoint) if isinstance(checkpoint, dict) else checkpoint
    chars = checkpoint.get("chars", CHARS) if isinstance(checkpoint, dict) else CHARS
    config = checkpoint.get("config", {}) if isinstance(checkpoint, dict) else {}

    if "norm.weight" in state:
        model = EnglishLSTMCTC(
            input_size=int(config.get("input_size", 26)),
            hidden_size=int(config.get("hidden_size", 256)),
            num_layers=int(config.get("layers", config.get("num_layers", 3))),
            vocab_size=len(chars),
        )
        pad_to_duration = False
        max_duration = float(config.get("max_duration", 12.0))
    else:
        model = LSTM_CTC(vocab_size=len(chars))
        pad_to_duration = True
        max_duration = MAX_DURATION

    model.load_state_dict(state)
    model.eval()
    return model, chars, max_duration, pad_to_duration


def evaluate_split(model, chars, max_duration, pad_to_duration, split, limit):
    samples = load_samples(split, limit)
    references = []
    predictions = []
    examples = []
    confidences = []
    started = time.perf_counter()
    with torch.no_grad():
        for sample in samples:
            features = extract_features(sample["audio"], max_duration, pad_to_duration)
            logits = model(features)[0]
            prediction, mean_confidence, max_confidence = ctc_decode(logits, chars)
            references.append(sample["reference"])
            predictions.append(prediction)
            confidences.append(mean_confidence)
            if len(examples) < 10:
                examples.append({
                    "file": sample["audio"].name,
                    "reference": sample["reference"],
                    "prediction": prediction,
                    "mean_confidence": round(mean_confidence, 4),
                    "max_confidence": round(max_confidence, 4),
                })

    aggregate = SpeechMetricsCalculator()
    aggregate.update_many(references, predictions)
    metric_values = aggregate.get_metrics()
    word_error_rate = metric_values["wer"] if references else 1.0
    char_error_rate = metric_values["cer"] if references else 1.0
    return {
        "split": split,
        "samples": len(samples),
        "wer": word_error_rate,
        "cer": char_error_rate,
        "word_accuracy": max(0.0, 1.0 - word_error_rate),
        "character_accuracy": max(0.0, 1.0 - char_error_rate),
        "sentence_accuracy": metric_values["sentence_accuracy"] if references else 0.0,
        **word_overlap_metrics(references, predictions),
        "mean_confidence": float(np.mean(confidences)) if confidences else 0.0,
        "elapsed_seconds": round(time.perf_counter() - started, 3),
        "examples": examples,
    }


def evaluate_model_path(model_path, sample_limit=50):
    model, chars, max_duration, pad_to_duration = load_model(model_path)
    results = {
        "model_path": str(model_path.relative_to(ROOT)),
        "task": "English speech-to-text using LSTM-CTC",
        "target_word_accuracy": 0.75,
        "max_duration": max_duration,
        "padded_audio": pad_to_duration,
        "splits": [
            evaluate_split(model, chars, max_duration, pad_to_duration, "test-clean", sample_limit),
            evaluate_split(model, chars, max_duration, pad_to_duration, "dev-clean", sample_limit),
        ],
    }
    accuracies = [item["word_accuracy"] for item in results["splits"] if item["samples"]]
    results["overall_word_accuracy"] = float(np.mean(accuracies)) if accuracies else 0.0
    results["target_met"] = results["overall_word_accuracy"] >= results["target_word_accuracy"]
    return results


def main():
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("--model", default=str(DEFAULT_MODEL_PATH))
    parser.add_argument("--samples", type=int, default=50)
    args = parser.parse_args()

    results = evaluate_model_path(Path(args.model), args.samples)
    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()
