#!/usr/bin/env python3
"""Evaluate the CPU English LSTM-CTC model on a JSONL manifest."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import librosa
import numpy as np
import torch

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from ml.common.metrics_cpu import SpeechMetricsCalculator
from scripts.train_english_lstm_ctc_real import CHARS, EnglishLSTMCTC, SAMPLE_RATE, extract_features_from_audio


def decode_ctc(logits: torch.Tensor, chars: list[str]) -> str:
    indices = torch.argmax(logits, dim=-1).detach().cpu().tolist()
    output = []
    previous = None
    for idx in indices:
        if idx != 0 and idx != previous:
            output.append(chars[idx])
        previous = idx
    return "".join(output).strip()


def load_model(model_path: Path) -> tuple[EnglishLSTMCTC, list[str]]:
    checkpoint = torch.load(model_path, map_location="cpu")
    chars = checkpoint.get("chars", CHARS)
    config = checkpoint.get("config", {})
    model = EnglishLSTMCTC(
        input_size=int(config.get("input_size", 26)),
        hidden_size=int(config.get("hidden_size", 256)),
        layers=int(config.get("layers", 3)),
        vocab_size=len(chars),
    )
    model.load_state_dict(checkpoint["model_state_dict"])
    model.eval()
    return model, chars


def iter_manifest(manifest_path: Path, limit: int = 0):
    count = 0
    with manifest_path.open("r", encoding="utf-8") as handle:
        for line in handle:
            if not line.strip():
                continue
            row = json.loads(line)
            audio = row.get("audio_filepath") or row.get("audio")
            text = row.get("text", "")
            if audio and text:
                yield Path(audio), text
                count += 1
                if limit and count >= limit:
                    return


def evaluate(model_path: Path, manifest_path: Path, limit: int = 0) -> dict:
    model, chars = load_model(model_path)
    metrics = SpeechMetricsCalculator()
    examples = []
    with torch.no_grad():
        for audio_path, reference in iter_manifest(manifest_path, limit):
            audio, _ = librosa.load(str(audio_path), sr=SAMPLE_RATE, mono=True)
            features = extract_features_from_audio(audio).unsqueeze(0)
            logits = model(features)[0]
            hypothesis = decode_ctc(logits, chars)
            metrics.update(reference, hypothesis)
            if len(examples) < 10:
                examples.append({"audio": str(audio_path), "reference": reference, "hypothesis": hypothesis})
    result = metrics.get_metrics()
    result["model_path"] = str(model_path)
    result["manifest_path"] = str(manifest_path)
    result["examples"] = examples
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", default="ml-speech/models/english_lstm_ctc_best.pt")
    parser.add_argument("--manifest", default="speech_datasets/manifests/test.jsonl")
    parser.add_argument("--limit", type=int, default=200)
    parser.add_argument("--output", default="open_vocab_lstm_final_eval.json")
    args = parser.parse_args()

    result = evaluate(Path(args.model), Path(args.manifest), args.limit)
    Path(args.output).write_text(json.dumps(result, indent=2), encoding="utf-8")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
