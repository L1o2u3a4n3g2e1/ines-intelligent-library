import os

import requests
import uvicorn
from fastapi import FastAPI, File, HTTPException, UploadFile


OPEN_STT_URL = os.getenv("INES_OPEN_STT_URL", "http://127.0.0.1:5001")
TRANSFORMER_STT_URL = os.getenv("INES_TRANSFORMER_STT_URL", "http://127.0.0.1:5006")

app = FastAPI(
    title="INES Digital Library Python Backend",
    description="Internal AI and audio service gateway. The PHP API remains the public authenticated backend.",
)


def service_health(base_url: str) -> dict:
    try:
        response = requests.get(f"{base_url}/health", timeout=3)
        response.raise_for_status()
        return {"reachable": True, **response.json()}
    except Exception as error:
        return {"reachable": False, "error": str(error)}


@app.get("/health")
def health():
    open_stt = service_health(OPEN_STT_URL)
    transformer_stt = service_health(TRANSFORMER_STT_URL)
    return {
        "status": "ready" if transformer_stt["reachable"] or open_stt["reachable"] else "degraded",
        "service": "ines-python-ai-backend",
        "open_vocabulary_stt": open_stt,
        "transformer_stt": transformer_stt,
    }


@app.get("/api/models")
def models():
    return {
        "open_vocabulary_stt": service_health(OPEN_STT_URL),
        "transformer_stt": service_health(TRANSFORMER_STT_URL),
        "text_to_speech": {
            "status": "ready",
            "model": "gTTS 2.5.1",
            "execution": "PHP invokes scripts/gtts_synthesize.py",
        },
    }


@app.post("/api/stt/transcribe")
async def transcribe(file: UploadFile = File(...)):
    payload = await file.read()
    if not payload:
        raise HTTPException(status_code=422, detail="Audio file is empty")
    attempts = []
    try:
        response = requests.post(
            f"{TRANSFORMER_STT_URL}/transcribe",
            files={"audio": (file.filename or "voice.webm", payload, file.content_type or "audio/webm")},
            timeout=100,
        )
        data = response.json()
        if response.status_code < 400 and data.get("success"):
            return {
                **data,
                "selected_model": data.get("model", "transformer-wav2vec2-ctc"),
                "fallback_used": False,
                "model_attempts": [{"model": "transformer_wav2vec2_ctc", "status": "success"}],
            }
        attempts.append({"model": "transformer_wav2vec2_ctc", "error": data.get("detail", data)})
    except (requests.RequestException, ValueError) as error:
        attempts.append({"model": "transformer_wav2vec2_ctc", "error": str(error)})

    try:
        fallback_response = requests.post(
            f"{OPEN_STT_URL}/transcribe",
            files={"audio": (file.filename or "voice.webm", payload, file.content_type or "audio/webm")},
            timeout=100,
        )
        fallback_response.raise_for_status()
        fallback_data = fallback_response.json()
    except (requests.RequestException, ValueError) as error:
        raise HTTPException(
            status_code=503,
            detail=f"Transformer and Whisper STT are unavailable: {error}",
        ) from error

    return {
        **fallback_data,
        "selected_model": fallback_data.get("model", "whisper"),
        "fallback_used": True,
        "fallback_reason": "Transformer STT did not return a usable transcription",
        "model_attempts": attempts,
    }


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=5003, log_level="info")
