#!/usr/bin/env python3
import argparse
import json
from pathlib import Path

import soundfile as sf


def validate_manifest(path, max_errors=10):
    path = Path(path)
    result = {
        "manifest": str(path),
        "exists": path.exists(),
        "total_lines": 0,
        "valid_samples": 0,
        "invalid_samples": 0,
        "audio_missing": 0,
        "audio_corrupt": 0,
        "missing_fields": 0,
        "invalid_json": 0,
        "duration_seconds": 0.0,
        "examples": [],
    }
    if not path.exists():
        return result

    with path.open("r", encoding="utf-8") as handle:
        for idx, line in enumerate(handle, start=1):
            if not line.strip():
                continue
            result["total_lines"] += 1
            try:
                sample = json.loads(line)
            except json.JSONDecodeError as error:
                result["invalid_json"] += 1
                result["invalid_samples"] += 1
                if len(result["examples"]) < max_errors:
                    result["examples"].append({"line": idx, "reason": f"Invalid JSON: {error}"})
                continue

            audio_value = sample.get("audio") or sample.get("audio_filepath")
            text_value = sample.get("text")
            if not audio_value or not text_value:
                result["missing_fields"] += 1
                result["invalid_samples"] += 1
                if len(result["examples"]) < max_errors:
                    result["examples"].append({"line": idx, "reason": "Missing audio/audio_filepath or text"})
                continue

            audio_path = Path(audio_value)
            if not audio_path.exists():
                result["audio_missing"] += 1
                result["invalid_samples"] += 1
                if len(result["examples"]) < max_errors:
                    result["examples"].append({"line": idx, "reason": f"Audio file not found: {audio_path}"})
                continue

            try:
                info = sf.info(str(audio_path))
            except Exception as error:
                result["audio_corrupt"] += 1
                result["invalid_samples"] += 1
                if len(result["examples"]) < max_errors:
                    result["examples"].append({"line": idx, "reason": f"Audio unreadable: {error}"})
                continue

            result["valid_samples"] += 1
            result["duration_seconds"] += float(info.duration)

    result["duration_hours"] = round(result["duration_seconds"] / 3600, 3)
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest-root", default="speech_datasets/manifests")
    parser.add_argument("--output", default="speech_datasets/manifest_validation_report.json")
    args = parser.parse_args()

    root = Path(args.manifest_root)
    results = [validate_manifest(root / f"{split}.jsonl") for split in ("train", "dev", "test")]
    payload = {
        "manifest_root": str(root),
        "results": results,
        "all_valid": all(item["exists"] and item["invalid_samples"] == 0 and item["valid_samples"] > 0 for item in results),
        "ready_for_training": results[0]["valid_samples"] > 0 and all(item["invalid_samples"] == 0 for item in results),
    }
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(json.dumps(payload, indent=2))


if __name__ == "__main__":
    main()
