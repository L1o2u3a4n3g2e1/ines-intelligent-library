import json
import os
import shutil
import subprocess
import tempfile
from pathlib import Path
from threading import Lock

import librosa
import torch
import uvicorn
from fastapi import FastAPI, File, HTTPException, UploadFile

from train_english_lstm_ctc_real import (
    BLANK,
    EnglishLSTMCTC,
    IDX_TO_CHAR,
    METRICS_PATH,
    MODEL_DIR,
    extract_features_from_audio,
)


MODEL_PATH = MODEL_DIR / "english_lstm_ctc_best.pt"
MAX_UPLOAD_BYTES = 10 * 1024 * 1024
MINIMUM_CANDIDATE_WORD_ACCURACY = float(
    os.getenv("INES_LSTM_MINIMUM_WORD_ACCURACY", "55")
)
PRODUCTION_WORD_ACCURACY = float(
    os.getenv("INES_LSTM_PRODUCTION_WORD_ACCURACY", "80")
)
PRODUCTION_SENTENCE_ACCURACY = float(
    os.getenv("INES_LSTM_PRODUCTION_SENTENCE_ACCURACY", "50")
)

app = FastAPI(title="INES Open-Vocabulary English BiLSTM-CTC")
torch.set_num_threads(max(1, min(2, torch.get_num_threads())))


def read_metrics() -> dict:
    if not METRICS_PATH.exists():
        return {}
    try:
        return json.loads(METRICS_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}


def quality_status() -> dict:
    metrics = read_metrics()
    word_accuracy = float(metrics.get("overall_word_accuracy_percent", 0))
    sentence_accuracy = float(metrics.get("overall_sentence_accuracy", 0)) * 100
    return {
        "word_accuracy_percent": word_accuracy,
        "sentence_exact_accuracy_percent": sentence_accuracy,
        "minimum_candidate_ready": word_accuracy >= MINIMUM_CANDIDATE_WORD_ACCURACY,
        "production_ready": (
            word_accuracy >= PRODUCTION_WORD_ACCURACY
            and sentence_accuracy >= PRODUCTION_SENTENCE_ACCURACY
        ),
        "minimum_candidate_word_accuracy_percent": MINIMUM_CANDIDATE_WORD_ACCURACY,
        "required_word_accuracy_percent": PRODUCTION_WORD_ACCURACY,
        "required_sentence_exact_accuracy_percent": PRODUCTION_SENTENCE_ACCURACY,
        "evaluated_at": metrics.get("evaluated_at"),
    }


def find_ffmpeg() -> str | None:
    ffmpeg = shutil.which("ffmpeg")
    if ffmpeg or os.name != "nt":
        return ffmpeg
    winget_root = Path.home() / "AppData/Local/Microsoft/WinGet/Packages"
    return next(
        (
            str(path)
            for path in winget_root.glob("Gyan.FFmpeg_*/ffmpeg-*/bin/ffmpeg.exe")
        ),
        None,
    )


def normalize_browser_audio(source: Path, target: Path) -> None:
    ffmpeg = find_ffmpeg()
    if not ffmpeg:
        raise RuntimeError("FFmpeg is required to decode microphone audio")
    completed = subprocess.run(
        [
            ffmpeg,
            "-hide_banner",
            "-loglevel",
            "error",
            "-y",
            "-i",
            str(source),
            "-af",
            "silenceremove=start_periods=1:start_duration=0.03:start_threshold=-45dB",
            "-ac",
            "1",
            "-ar",
            "16000",
            "-t",
            "12",
            str(target),
        ],
        capture_output=True,
        text=True,
        timeout=30,
    )
    if completed.returncode != 0 or not target.exists() or target.stat().st_size <= 44:
        raise RuntimeError(completed.stderr.strip() or "Audio conversion failed")


class ModelRuntime:
    def __init__(self):
        self.model = None
        self.loaded_mtime = None
        self.checkpoint_epoch = None
        self.lock = Lock()

    def ensure_loaded(self):
        if not MODEL_PATH.exists():
            raise RuntimeError(f"Checkpoint not found: {MODEL_PATH}")
        mtime = MODEL_PATH.stat().st_mtime
        if self.model is not None and self.loaded_mtime == mtime:
            return
        with self.lock:
            if self.model is not None and self.loaded_mtime == mtime:
                return
            checkpoint = torch.load(
                MODEL_PATH,
                map_location="cpu",
                weights_only=False,
            )
            config = checkpoint.get("config", {})
            model = EnglishLSTMCTC(
                hidden_size=int(config.get("hidden_size", 128)),
                layers=int(config.get("layers", 2)),
            )
            model.load_state_dict(checkpoint["model_state_dict"])
            model.eval()
            self.model = model
            self.loaded_mtime = mtime
            self.checkpoint_epoch = int(checkpoint.get("epoch", 0))

    def transcribe(self, audio_path: Path) -> dict:
        self.ensure_loaded()
        audio, _ = librosa.load(str(audio_path), sr=16000, mono=True)
        features = extract_features_from_audio(audio).unsqueeze(0)
        lengths = torch.LongTensor([features.shape[1]])
        with self.lock, torch.inference_mode():
            logits = self.model(features, lengths)[0]
            probabilities = torch.softmax(logits, dim=-1)

        indices = torch.argmax(probabilities, dim=-1).tolist()
        characters = []
        token_confidences = []
        previous = None
        for frame, index in enumerate(indices):
            if index != BLANK and index != previous:
                characters.append(IDX_TO_CHAR[index])
                token_confidences.append(float(probabilities[frame, index]))
            previous = index

        transcript = " ".join("".join(characters).strip().split())
        confidence = (
            sum(token_confidences) / len(token_confidences)
            if token_confidences
            else 0.0
        )
        return {
            "transcription": transcript,
            "confidence": confidence,
            "checkpoint_epoch": self.checkpoint_epoch,
        }


runtime = ModelRuntime()


@app.get("/health")
def health():
    checkpoint_exists = MODEL_PATH.exists()
    try:
        runtime.ensure_loaded()
        load_error = None
    except Exception as error:
        load_error = str(error)
    return {
        "status": "ready" if checkpoint_exists and load_error is None else "unavailable",
        "model": "english_bilstm_ctc",
        "task": "open_vocabulary_speech_to_text",
        "checkpoint": str(MODEL_PATH),
        "checkpoint_epoch": runtime.checkpoint_epoch,
        "quality_gate": quality_status(),
        "error": load_error,
    }


@app.post("/transcribe")
async def transcribe(audio: UploadFile = File(...)):
    payload = await audio.read()
    if not payload:
        raise HTTPException(status_code=422, detail="The microphone recording is empty")
    if len(payload) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="The microphone recording is too large")

    suffix = Path(audio.filename or "voice.webm").suffix or ".webm"
    with tempfile.TemporaryDirectory(prefix="ines-lstm-ctc-") as directory:
        source = Path(directory) / f"recording{suffix}"
        normalized = Path(directory) / "normalized.wav"
        source.write_bytes(payload)
        try:
            normalize_browser_audio(source, normalized)
            result = runtime.transcribe(normalized)
        except Exception as error:
            raise HTTPException(status_code=422, detail=str(error)) from error

    quality = quality_status()
    return {
        "success": bool(result["transcription"]),
        "transcription": result["transcription"],
        "confidence": result["confidence"],
        "confidence_type": "mean_collapsed_ctc_token_probability",
        "language": "en",
        "model": "english_bilstm_ctc",
        "checkpoint_epoch": result["checkpoint_epoch"],
        "quality_gate": quality,
    }


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=5004, log_level="info")
