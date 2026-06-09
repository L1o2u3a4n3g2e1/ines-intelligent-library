#!/usr/bin/env python3
"""Real-time JSONL metrics logging for CPU LSTM-CTC training."""

from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path


class TrainingMetricsLogger:
    def __init__(self, log_dir: str = "training_logs"):
        self.log_dir = Path(log_dir)
        self.log_dir.mkdir(parents=True, exist_ok=True)
        self.metrics_file = self.log_dir / "metrics.jsonl"
        self.summary_file = self.log_dir / "summary.json"

    def log_epoch(
        self,
        epoch: int,
        train_loss: float | None,
        val_loss: float | None,
        wer: float,
        cer: float,
        accuracy: float,
        learning_rate: float | None = None,
        extra: dict | None = None,
    ) -> dict:
        entry = {
            "timestamp": datetime.now().isoformat(),
            "epoch": int(epoch),
            "train_loss": None if train_loss is None else float(train_loss),
            "val_loss": None if val_loss is None else float(val_loss),
            "wer": float(wer),
            "cer": float(cer),
            "accuracy": float(accuracy),
            "learning_rate": None if learning_rate is None else float(learning_rate),
        }
        if extra:
            entry.update(extra)
        with self.metrics_file.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(entry) + "\n")
        self.write_summary()
        return entry

    def read_epochs(self) -> list[dict]:
        if not self.metrics_file.exists():
            return []
        rows = []
        with self.metrics_file.open("r", encoding="utf-8") as handle:
            for line in handle:
                if line.strip():
                    rows.append(json.loads(line))
        return rows

    def best_epoch(self) -> dict | None:
        rows = self.read_epochs()
        return min(rows, key=lambda row: row.get("cer", float("inf")), default=None)

    def write_summary(self) -> dict:
        rows = self.read_epochs()
        best = self.best_epoch()
        summary = {
            "updated_at": datetime.now().isoformat(),
            "epochs_logged": len(rows),
            "best_by_cer": best,
            "latest": rows[-1] if rows else None,
        }
        self.summary_file.write_text(json.dumps(summary, indent=2), encoding="utf-8")
        return summary


if __name__ == "__main__":
    logger = TrainingMetricsLogger()
    print(json.dumps(logger.write_summary(), indent=2))
