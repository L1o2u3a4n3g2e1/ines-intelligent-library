#!/usr/bin/env python3
"""
Staged English STT dataset downloader for the digital-library LSTM model.

This intentionally prepares datasets for scripts/train_english_lstm_ctc_real.py.
It does not train Whisper, because Whisper is a Transformer model and does not
meet the project's RNN/LSTM requirement.
"""

import argparse
import json
import shutil
import tarfile
import time
from pathlib import Path
from urllib.request import urlopen, Request


ROOT = Path(__file__).resolve().parents[2]
DOWNLOAD_ROOT = ROOT / "speech_datasets"
DATASET_ROOT = DOWNLOAD_ROOT / "LibriSpeech"
REPORT_PATH = ROOT / "speech_datasets" / "download_report.json"
MANIFEST_ROOT = ROOT / "speech_datasets" / "manifests"
PROCESSED_ROOT = DOWNLOAD_ROOT / "processed"

LIBRISPEECH = {
    "dev-clean": {
        "url": "https://www.openslr.org/resources/12/dev-clean.tar.gz",
        "archive": "dev-clean.tar.gz",
        "expected_dir": DATASET_ROOT / "dev-clean",
        "approx_gb": 0.34,
    },
    "test-clean": {
        "url": "https://www.openslr.org/resources/12/test-clean.tar.gz",
        "archive": "test-clean.tar.gz",
        "expected_dir": DATASET_ROOT / "test-clean",
        "approx_gb": 0.35,
    },
    "train-clean-100": {
        "url": "https://www.openslr.org/resources/12/train-clean-100.tar.gz",
        "archive": "train-clean-100.tar.gz",
        "expected_dir": DATASET_ROOT / "train-clean-100",
        "approx_gb": 6.3,
    },
    "train-clean-360": {
        "url": "https://www.openslr.org/resources/12/train-clean-360.tar.gz",
        "archive": "train-clean-360.tar.gz",
        "expected_dir": DATASET_ROOT / "train-clean-360",
        "approx_gb": 23.0,
    },
    "train-other-500": {
        "url": "https://www.openslr.org/resources/12/train-other-500.tar.gz",
        "archive": "train-other-500.tar.gz",
        "expected_dir": DATASET_ROOT / "train-other-500",
        "approx_gb": 31.0,
    },
}

MLS_ENGLISH = {
    "mls-english": {
        "url": "https://www.openslr.org/resources/94/mls_english.tar.gz",
        "archive": "mls_english.tar.gz",
        "expected_dir": DOWNLOAD_ROOT / "multilingual_librispeech" / "en",
        "approx_gb": 44.0,
    }
}

MANIFEST_SPLITS = {
    "train-clean-100": "train",
    "train-clean-360": "train",
    "train-other-500": "train",
    "dev-clean": "dev",
    "test-clean": "test",
}


def free_gb(path):
    usage = shutil.disk_usage(path)
    return usage.free / (1024 ** 3)


def safe_extract_tar_gz(archive, destination):
    destination = destination.resolve()
    with tarfile.open(archive, "r:gz") as tar:
        for member in tar.getmembers():
            target = (destination / member.name).resolve()
            if not str(target).startswith(str(destination)):
                raise RuntimeError(f"Unsafe tar path rejected: {member.name}")
        tar.extractall(destination)


def remote_size(url):
    request = Request(url, method="HEAD", headers={"User-Agent": "digital-library-lstm-dataset-downloader/1.0"})
    try:
        with urlopen(request, timeout=300) as response:
            return int(response.headers.get("Content-Length", 0))
    except Exception:
        return 0


def download(url, target):
    target.parent.mkdir(parents=True, exist_ok=True)
    total = remote_size(url)
    existing = target.stat().st_size if target.exists() else 0
    if target.exists() and existing > 0 and total and existing >= total:
        print(json.dumps({"status": "exists", "file": str(target), "size_mb": round(existing / (1024 ** 2), 1)}), flush=True)
        return

    headers = {"User-Agent": "digital-library-lstm-dataset-downloader/1.0"}
    mode = "wb"
    if existing > 0 and total and existing < total:
        headers["Range"] = f"bytes={existing}-"
        mode = "ab"
        print(json.dumps({
            "status": "resuming",
            "file": str(target),
            "existing_mb": round(existing / (1024 ** 2), 1),
            "total_mb": round(total / (1024 ** 2), 1),
        }), flush=True)
    elif existing > 0 and not total:
        target.unlink()
        existing = 0

    request = Request(url, headers=headers)
    started = time.perf_counter()
    with urlopen(request, timeout=300) as response:
        if not total:
            response_length = int(response.headers.get("Content-Length", 0))
            total = existing + response_length if response_length else 0
        downloaded = existing
        last_report = 0
        with target.open(mode) as handle:
            while True:
                chunk = response.read(1024 * 1024)
                if not chunk:
                    break
                handle.write(chunk)
                downloaded += len(chunk)
                now = time.perf_counter()
                if now - last_report > 10:
                    print(json.dumps({
                        "status": "downloading",
                        "file": str(target),
                        "downloaded_mb": round(downloaded / (1024 ** 2), 1),
                        "total_mb": round(total / (1024 ** 2), 1) if total else None,
                        "elapsed_seconds": round(now - started, 1),
                    }), flush=True)
                    last_report = now
    final_size = target.stat().st_size
    if total and final_size < total:
        raise RuntimeError(f"Incomplete download for {target}: got {final_size}, expected {total}. Re-run to resume.")


def count_split(split_dir):
    audio = list(split_dir.rglob("*.flac"))
    transcripts = list(split_dir.rglob("*.trans.txt"))
    return {"audio_files": len(audio), "transcript_files": len(transcripts)}


def clean_text(text):
    allowed = set(" ABCDEFGHIJKLMNOPQRSTUVWXYZ'.-")
    text = text.upper()
    text = "".join(ch for ch in text if ch in allowed)
    return " ".join(text.split())


def librispeech_rows(split):
    split_dir = DATASET_ROOT / split
    if not split_dir.exists():
        return []
    rows = []
    for trans_file in sorted(split_dir.rglob("*.trans.txt")):
        with trans_file.open("r", encoding="utf-8") as handle:
            for line in handle:
                parts = line.strip().split(" ", 1)
                if len(parts) != 2:
                    continue
                file_id, transcript = parts
                audio = trans_file.parent / f"{file_id}.flac"
                text = clean_text(transcript)
                if audio.exists() and text:
                    rows.append({
                        "audio_filepath": str(audio.resolve()),
                        "text": text,
                        "dataset": "LibriSpeech",
                        "source_split": split,
                    })
    return rows


def mls_rows():
    base = DOWNLOAD_ROOT / "multilingual_librispeech" / "en"
    if not base.exists():
        return []
    rows = []
    audio_exts = [".flac", ".opus", ".ogg", ".mp3", ".wav"]
    for transcript_file in sorted(base.rglob("transcripts.txt")):
        with transcript_file.open("r", encoding="utf-8") as handle:
            for line in handle:
                parts = line.strip().split(maxsplit=1)
                if len(parts) != 2:
                    continue
                file_id, transcript = parts
                audio = None
                for ext in audio_exts:
                    matches = list(transcript_file.parent.rglob(f"{file_id}{ext}"))
                    if matches:
                        audio = matches[0]
                        break
                text = clean_text(transcript)
                if audio and text:
                    rows.append({
                        "audio_filepath": str(audio.resolve()),
                        "text": text,
                        "dataset": "Multilingual LibriSpeech English",
                        "source_split": "mls-english",
                    })
    return rows


def rebuild_manifests():
    MANIFEST_ROOT.mkdir(parents=True, exist_ok=True)
    grouped = {"train": [], "dev": [], "test": []}
    for source_split, target_split in MANIFEST_SPLITS.items():
        grouped[target_split].extend(librispeech_rows(source_split))
    grouped["train"].extend(mls_rows())

    summary = {}
    for split, rows in grouped.items():
        path = MANIFEST_ROOT / f"{split}.jsonl"
        with path.open("w", encoding="utf-8") as handle:
            for row in rows:
                handle.write(json.dumps(row) + "\n")
        summary[split] = {"path": str(path), "samples": len(rows)}

    summary_path = MANIFEST_ROOT / "summary.json"
    summary_path.write_text(json.dumps({
        "created_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "purpose": "Combined real English STT manifests for LSTM-CTC training",
        "splits": summary,
    }, indent=2), encoding="utf-8")
    print(json.dumps({"status": "manifests_rebuilt", "summary": summary}), flush=True)
    return summary


def download_mls_english(keep_archive=False):
    item = MLS_ENGLISH["mls-english"]
    item["expected_dir"].mkdir(parents=True, exist_ok=True)
    archive = DOWNLOAD_ROOT / item["archive"]
    required = item["approx_gb"] + 5.0
    available = free_gb(ROOT)
    if available < required:
        raise RuntimeError(f"Not enough disk for MLS English: need about {required:.1f} GB free, have {available:.1f} GB")

    if not any(item["expected_dir"].rglob("transcripts.txt")):
        download(item["url"], archive)
        print(json.dumps({"status": "extracting", "archive": str(archive)}), flush=True)
        safe_extract_tar_gz(archive, DOWNLOAD_ROOT / "multilingual_librispeech")
        extracted = DOWNLOAD_ROOT / "multilingual_librispeech" / "mls_english"
        if extracted.exists() and not any(item["expected_dir"].iterdir()):
            for child in extracted.iterdir():
                shutil.move(str(child), str(item["expected_dir"] / child.name))
            extracted.rmdir()
        if not keep_archive and archive.exists():
            archive.unlink()

    rebuild_manifests()
    return {"dataset": "mls-english", "status": "prepared", "manifest_rows": len(mls_rows())}


def download_librispeech_split(name, keep_archive=False):
    item = LIBRISPEECH[name]
    DOWNLOAD_ROOT.mkdir(parents=True, exist_ok=True)
    DATASET_ROOT.mkdir(parents=True, exist_ok=True)
    (PROCESSED_ROOT / "features").mkdir(parents=True, exist_ok=True)
    (PROCESSED_ROOT / "metadata").mkdir(parents=True, exist_ok=True)

    if item["expected_dir"].exists():
        result = {"split": name, "status": "already_prepared", **count_split(item["expected_dir"])}
        rebuild_manifests()
        print(json.dumps(result), flush=True)
        return result

    required = item["approx_gb"] + 2.0
    available = free_gb(ROOT)
    if available < required:
        raise RuntimeError(f"Not enough disk for {name}: need about {required:.1f} GB free, have {available:.1f} GB")

    archive = DOWNLOAD_ROOT / item["archive"]
    download(item["url"], archive)
    print(json.dumps({"status": "extracting", "archive": str(archive)}), flush=True)
    safe_extract_tar_gz(archive, DOWNLOAD_ROOT)

    if not keep_archive and archive.exists():
        archive.unlink()

    result = {"split": name, "status": "prepared", **count_split(item["expected_dir"])}
    rebuild_manifests()
    print(json.dumps(result), flush=True)
    return result


def write_report(results):
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "created_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "purpose": "English open-vocabulary LSTM-CTC STT training data",
        "model_requirement": "RNN/LSTM, not Whisper/Transformer",
        "results": results,
        "training_command": "python scripts/train_english_lstm_ctc_real.py --epochs 100 --batch-size 8 --lr 0.001 --eval-samples 100 --target-accuracy 0.75 --manifest-root speech_datasets/manifests --grad-accum-steps 4 --early-stop-patience 12 --resume",
        "evaluation_command": "python scripts/evaluate_english_lstm_stt_real.py --model ml-speech/models/english_lstm_ctc_best.pt --samples 200",
    }
    REPORT_PATH.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset", choices=["librispeech", "mls-english"], default="librispeech")
    parser.add_argument(
        "--splits",
        nargs="+",
        default=["dev-clean", "test-clean", "train-clean-100"],
        choices=list(LIBRISPEECH),
    )
    parser.add_argument("--keep-archives", action="store_true")
    args = parser.parse_args()

    results = []
    if args.dataset == "mls-english":
        results.append(download_mls_english(args.keep_archives))
        write_report(results)
    else:
        for split in args.splits:
            results.append(download_librispeech_split(split, args.keep_archives))
            write_report(results)

    print(json.dumps({"status": "complete", "report": str(REPORT_PATH), "results": results}, indent=2))


if __name__ == "__main__":
    main()
