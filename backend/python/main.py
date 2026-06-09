import json
import os
from pathlib import Path

import requests
import uvicorn
from fastapi import FastAPI, File, HTTPException, Query, UploadFile


ROOT = Path(__file__).resolve().parents[2]
OPEN_STT_URL = os.getenv("INES_OPEN_STT_URL", "http://127.0.0.1:5001")
LSTM_CTC_URL = os.getenv("INES_LSTM_CTC_URL", "http://127.0.0.1:5004")
WAV2VEC2_LSTM_URL = os.getenv(
    "INES_WAV2VEC2_LSTM_URL",
    "http://127.0.0.1:5005",
)

app = FastAPI(
    title="INES Digital Library Python Backend",
    description="Internal AI, audio, and ML service gateway. The PHP API remains the public authenticated backend.",
)


def service_health(base_url: str) -> dict:
    try:
        response = requests.get(f"{base_url}/health", timeout=3)
        response.raise_for_status()
        return {"reachable": True, **response.json()}
    except Exception as error:
        return {"reachable": False, "error": str(error)}


def read_last_json_line(path: Path) -> dict | None:
    if not path.exists():
        return None
    lines = [line for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]
    if not lines:
        return None
    try:
        return json.loads(lines[-1])
    except json.JSONDecodeError:
        return None


@app.get("/health")
def health():
    open_stt = service_health(OPEN_STT_URL)
    lstm_ctc = service_health(LSTM_CTC_URL)
    wav2vec2_lstm = service_health(WAV2VEC2_LSTM_URL)
    return {
        "status": "ready" if open_stt["reachable"] else "degraded",
        "service": "ines-python-ai-backend",
        "open_vocabulary_stt": open_stt,
        "custom_lstm_ctc": lstm_ctc,
        "wav2vec2_lstm_adapter": wav2vec2_lstm,
    }


@app.get("/api/models")
def models():
    return {
        "open_vocabulary_stt": service_health(OPEN_STT_URL),
        "custom_lstm_ctc": service_health(LSTM_CTC_URL),
        "wav2vec2_lstm_adapter": service_health(WAV2VEC2_LSTM_URL),
        "text_to_speech": {
            "status": "ready",
            "model": "gTTS 2.5.1",
            "execution": "PHP invokes scripts/gtts_synthesize.py",
        },
    }


@app.get("/api/training/status")
def training_status():
    session_path = ROOT / "training_logs" / "lstm_ctc_session.json"
    session = json.loads(session_path.read_text(encoding="utf-8")) if session_path.exists() else None
    return {
        "session": session,
        "latest_progress": read_last_json_line(ROOT / "logs" / "english_lstm_ctc_progress.jsonl"),
        "latest_completed_epoch": read_last_json_line(ROOT / "logs" / "english_lstm_ctc_training.jsonl"),
        "best_checkpoint_exists": (ROOT / "ml-speech" / "models" / "english_lstm_ctc_best.pt").exists(),
        "last_checkpoint_exists": (ROOT / "ml-speech" / "models" / "english_lstm_ctc_last.pt").exists(),
    }


@app.post("/api/stt/transcribe")
async def transcribe(
    file: UploadFile = File(...),
    mode: str = Query(default="open", pattern="^(open|lstm)$"),
):
    payload = await file.read()
    if not payload:
        raise HTTPException(status_code=422, detail="Audio file is empty")
    if mode == "open":
        attempts = []
        for name, service_url in (
            ("wav2vec2_residual_bilstm_ctc", WAV2VEC2_LSTM_URL),
            ("mfcc_bilstm_ctc", LSTM_CTC_URL),
        ):
            try:
                candidate_response = requests.post(
                    f"{service_url}/transcribe",
                    files={
                        "audio": (
                            file.filename or "voice.webm",
                            payload,
                            file.content_type or "audio/webm",
                        )
                    },
                    timeout=100,
                )
                candidate_data = candidate_response.json()
            except (requests.RequestException, ValueError) as error:
                attempts.append({"model": name, "error": str(error)})
                continue

            if candidate_response.status_code >= 400:
                attempts.append(
                    {
                        "model": name,
                        "error": candidate_data.get("detail", candidate_data),
                    }
                )
                continue

            quality_gate = candidate_data.get("quality_gate") or {}
            attempts.append(
                {
                    "model": name,
                    "transcription": candidate_data.get("transcription", ""),
                    "confidence": candidate_data.get("confidence", 0),
                    "quality_gate": quality_gate,
                }
            )
            if (
                candidate_data.get("success")
                and quality_gate.get("production_ready")
                and float(candidate_data.get("confidence", 0)) >= 0.55
            ):
                return {
                    **candidate_data,
                    "selected_model": name,
                    "fallback_used": False,
                    "model_attempts": attempts,
                }

        try:
            fallback_response = requests.post(
                f"{OPEN_STT_URL}/transcribe",
                files={
                    "audio": (
                        file.filename or "voice.webm",
                        payload,
                        file.content_type or "audio/webm",
                    )
                },
                timeout=100,
            )
            fallback_response.raise_for_status()
            fallback_data = fallback_response.json()
        except (requests.RequestException, ValueError) as error:
            raise HTTPException(
                status_code=503,
                detail=f"Whisper fallback is unavailable: {error}",
            ) from error
        return {
            **fallback_data,
            "selected_model": fallback_data.get("model", "whisper"),
            "fallback_used": True,
            "fallback_reason": (
                "No custom LSTM model has passed the held-out production gate"
            ),
            "model_attempts": attempts,
        }

    target = LSTM_CTC_URL
    try:
        response = requests.post(
            f"{target}/transcribe",
            files={"audio": (file.filename or "voice.webm", payload, file.content_type or "audio/webm")},
            timeout=100,
        )
    except requests.RequestException as error:
        raise HTTPException(status_code=503, detail=f"{mode} STT service is unavailable: {error}") from error
    try:
        data = response.json()
    except ValueError as error:
        raise HTTPException(status_code=502, detail="STT service returned an invalid response") from error
    if response.status_code >= 400:
        raise HTTPException(status_code=response.status_code, detail=data)
    return data


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=5003, log_level="info")
