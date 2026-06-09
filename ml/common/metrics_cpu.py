#!/usr/bin/env python3
"""CPU-only speech recognition metrics for English LSTM-CTC STT."""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable


def normalize_text(text: str) -> str:
    text = text.upper()
    text = re.sub(r"[^ A-Z'.-]+", "", text)
    return re.sub(r"\s+", " ", text).strip()


def levenshtein(reference: list[str] | str, hypothesis: list[str] | str) -> int:
    if len(reference) < len(hypothesis):
        return levenshtein(hypothesis, reference)
    if not hypothesis:
        return len(reference)

    previous = list(range(len(hypothesis) + 1))
    for i, ref_item in enumerate(reference, start=1):
        current = [i]
        for j, hyp_item in enumerate(hypothesis, start=1):
            insertions = previous[j] + 1
            deletions = current[j - 1] + 1
            substitutions = previous[j - 1] + (ref_item != hyp_item)
            current.append(min(insertions, deletions, substitutions))
        previous = current
    return previous[-1]


def word_error_rate(reference: str, hypothesis: str) -> float:
    ref_words = normalize_text(reference).split()
    hyp_words = normalize_text(hypothesis).split()
    if not ref_words:
        return 0.0 if not hyp_words else 1.0
    return levenshtein(ref_words, hyp_words) / len(ref_words)


def character_error_rate(reference: str, hypothesis: str) -> float:
    ref_chars = normalize_text(reference)
    hyp_chars = normalize_text(hypothesis)
    if not ref_chars:
        return 0.0 if not hyp_chars else 1.0
    return levenshtein(ref_chars, hyp_chars) / len(ref_chars)


def sentence_accuracy(reference: str, hypothesis: str) -> float:
    return 1.0 if normalize_text(reference) == normalize_text(hypothesis) else 0.0


@dataclass
class SpeechMetricsCalculator:
    wer_sum: float = 0.0
    cer_sum: float = 0.0
    sentence_correct: float = 0.0
    samples: int = 0

    def update(self, reference: str, hypothesis: str) -> None:
        self.wer_sum += word_error_rate(reference, hypothesis)
        self.cer_sum += character_error_rate(reference, hypothesis)
        self.sentence_correct += sentence_accuracy(reference, hypothesis)
        self.samples += 1

    def update_many(self, references: Iterable[str], hypotheses: Iterable[str]) -> None:
        for reference, hypothesis in zip(references, hypotheses):
            self.update(reference, hypothesis)

    def get_metrics(self) -> dict:
        if self.samples == 0:
            return {"wer": 0.0, "cer": 0.0, "accuracy": 0.0, "sentence_accuracy": 0.0, "samples": 0}
        accuracy = self.sentence_correct / self.samples
        return {
            "wer": self.wer_sum / self.samples,
            "cer": self.cer_sum / self.samples,
            "accuracy": accuracy,
            "sentence_accuracy": accuracy,
            "samples": self.samples,
        }

    def save(self, path: str | Path) -> None:
        Path(path).write_text(json.dumps(self.get_metrics(), indent=2), encoding="utf-8")


if __name__ == "__main__":
    calc = SpeechMetricsCalculator()
    calc.update("THE QUICK BROWN FOX JUMPS", "THE QUICK BROWN FOX JUMP")
    calc.update("HELLO WORLD", "HELLO WORD")
    print(json.dumps(calc.get_metrics(), indent=2))
