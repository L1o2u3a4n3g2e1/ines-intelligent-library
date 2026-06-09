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
from transformers import Wav2Vec2ForCTC, Wav2Vec2Processor

from train_wav2vec2_lstm_adapter import MODEL_NAME, ResidualBiLSTMCTC


ROOT = Path(__file__).resolve().parents[1]
MODEL_PATH = ROOT / "ml-speech" / "models" / "wav2vec2_lstm_adapter_best.pt"
METRICS_PATH = ROOT / "models" / "stt" / "wav2vec2_lstm_adapter_metrics.json"
MAX_UPLOAD_BYTES = 10 * 1024 * 1024

app = FastAPI(title="INES Wav2Vec2 Residual BiLSTM STT")
torch.set_num_threads(max(1, min(2, torch.get_num_threads())))


def read_metrics():
    if not METRICS_PATH.exists():
        return {}
    try:
        return json.loads(METRICS_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}


def find_ffmpeg():
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


def normalize_browser_audio(source, target):
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


class Runtime:
    def __init__(self):
        self.lock = Lock()
        self.processor = Wav2Vec2Processor.from_pretrained(MODEL_NAME)
        self.pretrained = Wav2Vec2ForCTC.from_pretrained(MODEL_NAME)
        self.pretrained.eval()
        self.model = None
        self.loaded_mtime = None
        self.epoch = None

    def ensure_adapter(self):
        if not MODEL_PATH.exists():
            raise RuntimeError("The trained BiLSTM adapter checkpoint is not available yet")
        mtime = MODEL_PATH.stat().st_mtime
        if self.model is not None and self.loaded_mtime == mtime:
            return
        with self.lock:
            if self.model is not None and self.loaded_mtime == mtime:
                return
            checkpoint = torch.load(MODEL_PATH, map_location="cpu", weights_only=False)
            config = checkpoint["config"]
            model = ResidualBiLSTMCTC(
                self.pretrained.lm_head,
                encoder_dim=self.pretrained.config.hidden_size,
                hidden_size=int(config.get("hidden_size", 192)),
                layers=int(config.get("layers", 2)),
            )
            model.load_state_dict(checkpoint["model_state_dict"])
            model.eval()
            self.model = model
            self.loaded_mtime = mtime
            self.epoch = int(checkpoint.get("epoch", 0))

    def transcribe(self, path):
        self.ensure_adapter()
        audio, _ = librosa.load(str(path), sr=16000, mono=True)
        inputs = self.processor(audio, sampling_rate=16000, return_tensors="pt")
        with self.lock, torch.inference_mode():
            hidden = self.pretrained.wav2vec2(
                input_values=inputs.input_values,
                attention_mask=(
                    inputs.attention_mask
                    if "attention_mask" in inputs
                    else None
                ),
            ).last_hidden_state
            lengths = torch.LongTensor([hidden.shape[1]])
            logits = self.model(hidden, lengths)
            probabilities = torch.softmax(logits, dim=-1)
        ids = torch.argmax(probabilities, dim=-1)
        transcript = " ".join(
            self.processor.batch_decode(ids)[0].strip().split()
        )
        frame_confidence = torch.max(probabilities[0], dim=-1).values
        confidence = float(frame_confidence.mean())
        return transcript, confidence


runtime = Runtime()


@app.get("/health")
def health():
    metrics = read_metrics()
    try:
        runtime.ensure_adapter()
        error = None
    except Exception as exception:
        error = str(exception)
    return {
        "status": "ready" if error is None else "training",
        "model": "wav2vec2_residual_bilstm_ctc",
        "base_model": MODEL_NAME,
        "adapter_epoch": runtime.epoch,
        "production_ready": bool(metrics.get("production_ready", False)),
        "word_accuracy_percent": metrics.get("overall_word_accuracy_percent"),
        "sentence_exact_accuracy_percent": metrics.get(
            "overall_sentence_exact_accuracy_percent"
        ),
        "error": error,
    }


@app.post("/transcribe")
async def transcribe(audio: UploadFile = File(...)):
    metrics = read_metrics()
    payload = await audio.read()
    if not payload:
        raise HTTPException(status_code=422, detail="The microphone recording is empty")
    if len(payload) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="The microphone recording is too large")

    suffix = Path(audio.filename or "voice.webm").suffix or ".webm"
    with tempfile.TemporaryDirectory(prefix="ines-wav2vec2-lstm-") as directory:
        source = Path(directory) / f"recording{suffix}"
        normalized = Path(directory) / "normalized.wav"
        source.write_bytes(payload)
        try:
            normalize_browser_audio(source, normalized)
            transcript, confidence = runtime.transcribe(normalized)
        except Exception as error:
            raise HTTPException(status_code=422, detail=str(error)) from error

    return {
        "success": bool(transcript),
        "transcription": transcript,
        "confidence": confidence,
        "confidence_type": "mean_frame_max_probability",
        "language": "en",
        "model": "wav2vec2_residual_bilstm_ctc",
        "base_model": MODEL_NAME,
        "adapter_epoch": runtime.epoch,
        "quality_gate": {
            "production_ready": bool(metrics.get("production_ready", False)),
            "word_accuracy_percent": metrics.get("overall_word_accuracy_percent", 0),
            "sentence_exact_accuracy_percent": metrics.get(
                "overall_sentence_exact_accuracy_percent",
                0,
            ),
            "required_word_accuracy_percent": 80,
            "required_sentence_exact_accuracy_percent": 50,
        },
    }


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=5005, log_level="info")
