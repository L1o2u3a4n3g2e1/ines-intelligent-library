#!/usr/bin/env python3
"""Plot CPU LSTM-CTC training curves from JSONL metrics logs."""

from __future__ import annotations

import argparse
import json
from pathlib import Path


def read_metrics(path: Path) -> list[dict]:
    if not path.exists():
        return []
    rows = []
    with path.open("r", encoding="utf-8") as handle:
        for line in handle:
            if line.strip():
                rows.append(json.loads(line))
    return rows


def plot_metrics(metrics_path: Path, output_path: Path) -> dict:
    rows = read_metrics(metrics_path)
    if not rows:
        summary = {"status": "no_metrics", "metrics_path": str(metrics_path)}
        output_path.with_suffix(".json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
        return summary

    try:
        import matplotlib.pyplot as plt
    except Exception as error:
        summary = {
            "status": "matplotlib_unavailable",
            "error": str(error),
            "metrics_path": str(metrics_path),
            "epochs": len(rows),
        }
        output_path.with_suffix(".json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
        return summary

    epochs = [row["epoch"] for row in rows]
    loss = [row.get("train_loss", row.get("loss")) for row in rows]
    wer = [row.get("wer", row.get("dev_wer")) for row in rows]
    cer = [row.get("cer", row.get("dev_cer")) for row in rows]

    fig, axes = plt.subplots(3, 1, figsize=(10, 12), sharex=True)
    axes[0].plot(epochs, loss, marker="o")
    axes[0].set_ylabel("Loss")
    axes[0].grid(True, alpha=0.3)

    axes[1].plot(epochs, wer, marker="o", color="tab:orange")
    axes[1].set_ylabel("WER")
    axes[1].grid(True, alpha=0.3)

    axes[2].plot(epochs, cer, marker="o", color="tab:green")
    axes[2].set_ylabel("CER")
    axes[2].set_xlabel("Epoch")
    axes[2].grid(True, alpha=0.3)

    fig.suptitle("English LSTM-CTC CPU Training Metrics")
    fig.tight_layout()
    output_path.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(output_path, dpi=160)
    plt.close(fig)
    return {"status": "ok", "output": str(output_path), "epochs": len(rows)}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--metrics", default="training_logs/metrics.jsonl")
    parser.add_argument("--output", default="training_logs/training_curves.png")
    args = parser.parse_args()
    print(json.dumps(plot_metrics(Path(args.metrics), Path(args.output)), indent=2))


if __name__ == "__main__":
    main()
