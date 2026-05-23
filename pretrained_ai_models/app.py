#!/usr/bin/env python3
"""
FastAPI Application for Pretrained AI Models
Speech to Text, Translation, and Text to Speech for Kinyarwanda and English
Production-ready with JWT authentication, rate limiting, and hardened CORS
"""

import os
import sys

# Configure FFmpeg path FIRST before any other imports
ffmpeg_bin_path = r"C:\Users\Anne Louange\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.1.1-full_build\bin"
if os.path.exists(ffmpeg_bin_path):
    os.environ["PATH"] = ffmpeg_bin_path + os.pathsep + os.environ.get("PATH", "")
else:
    print(f"[WARN] FFmpeg not found at: {ffmpeg_bin_path}")

from pathlib import Path

# Load environment variables from .env file
from dotenv import load_dotenv
env_path = Path(__file__).parent / '.env'
if env_path.exists():
    load_dotenv(env_path)

import uuid
import torch
import soundfile as sf
from datetime import datetime, timedelta
import jwt
from functools import wraps
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from transformers import (
    AutoProcessor,
    AutoModelForSpeechSeq2Seq,
    pipeline,
    MarianTokenizer,
    MarianMTModel,
    VitsModel,
    AutoTokenizer
)
import logging
import time
from time import time as get_time
import json
import threading
import shutil
from typing import Optional

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize monitoring service
try:
    from monitoring_service import MetricsCollector, setup_logging
    metrics_collector = MetricsCollector(max_history=1000)
    logger = setup_logging(app_name="digital-library-ai", log_level=logging.INFO)
    logger.info("Monitoring service initialized")
except ImportError as e:
    logger.warning(f"Monitoring service not available: {e}")
    metrics_collector = None

# Initialize performance optimization caches
from collections import OrderedDict
from concurrent.futures import ThreadPoolExecutor

translation_result_cache = OrderedDict(maxlen=500)  # Cache last 500 translation results
audio_feature_cache = OrderedDict(maxlen=20)  # Cache last 20 audio files
executor = ThreadPoolExecutor(max_workers=4)  # For async processing

# ============================================================================
# SECURITY CONFIGURATION
# ============================================================================

# JWT Configuration
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-production-secret-key-change-this")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# CORS Configuration - restrict to specific domain
ALLOWED_ORIGINS = [
    "http://localhost",
    "http://localhost:80",
    "http://127.0.0.1",
    "http://127.0.0.1:80",
    os.getenv("ALLOWED_ORIGIN", "http://localhost"),
]

if os.getenv("ENVIRONMENT") == "production":
    ALLOWED_ORIGINS = [os.getenv("ALLOWED_ORIGIN", "http://localhost")]
    logger.warning(f"Production mode: restricting CORS to {ALLOWED_ORIGINS}")

# Initialize FastAPI app
app = FastAPI(title="Digital Library AI Service", version="2.0.0-secure")

# Add rate limiter
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

# Add CORS middleware with hardened settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["Content-Type", "Authorization"],
    max_age=600,
)

# Add metrics collection middleware
if metrics_collector:
    @app.middleware("http")
    async def add_metrics_middleware(request: Request, call_next):
        start_time = get_time()
        response = await call_next(request)
        process_time = get_time() - start_time

        metrics_collector.record_request(
            endpoint=request.url.path,
            status_code=response.status_code,
            response_time=process_time
        )

        response.headers["X-Process-Time"] = str(process_time)
        return response

# Directory configuration
UPLOAD_DIR = "uploads"
OUTPUT_DIR = "outputs"
RECORDINGS_DIR = "recordings"
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(RECORDINGS_DIR, exist_ok=True)
os.makedirs("models/stt", exist_ok=True)

# Training state for background job management
training_state = {
    "status": "idle",
    "progress": 0,
    "current_epoch": 0,
    "total_epochs": 0,
    "train_loss": None,
    "val_accuracy": None,
    "val_loss": None,
    "message": "",
    "started_at": None,
    "completed_at": None,
    "error": None,
}
training_lock = threading.Lock()

# Device configuration
device = "cuda:0" if torch.cuda.is_available() else "cpu"
torch_dtype = torch.float16 if torch.cuda.is_available() else torch.float32

logger.info(f"Using device: {device}")
logger.info(f"Using dtype: {torch_dtype}")

# ============================================================================
# JWT TOKEN MANAGEMENT
# ============================================================================

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return encoded_jwt

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer())):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# Model identifiers
RW_STT_MODEL = "leophill/whisper-large-v3-sn-kinyarwanda"
EN_STT_MODEL = "openai/whisper-large-v3"

# Translation cache
translation_cache = {}

# ============================================================================
# INITIALIZE MODELS ON STARTUP
# ============================================================================

logger.info("Loading Kinyarwanda STT model...")
try:
    rw_processor = AutoProcessor.from_pretrained(RW_STT_MODEL)
    rw_stt_model = AutoModelForSpeechSeq2Seq.from_pretrained(
        RW_STT_MODEL,
        torch_dtype=torch_dtype,
        low_cpu_mem_usage=True,
        use_safetensors=True
    ).to(device)
    rw_stt = pipeline(
        "automatic-speech-recognition",
        model=rw_stt_model,
        tokenizer=rw_processor.tokenizer,
        feature_extractor=rw_processor.feature_extractor,
        device=device if device != "cpu" else -1,
        torch_dtype=torch_dtype
    )
    logger.info("Kinyarwanda STT model loaded successfully")
except Exception as e:
    logger.error(f"Failed to load Kinyarwanda STT model: {e}")
    rw_stt = None

logger.info("Loading English STT model...")
try:
    en_processor = AutoProcessor.from_pretrained(EN_STT_MODEL)
    en_stt_model = AutoModelForSpeechSeq2Seq.from_pretrained(
        EN_STT_MODEL,
        torch_dtype=torch_dtype,
        low_cpu_mem_usage=True,
        use_safetensors=True
    ).to(device)
    en_stt = pipeline(
        "automatic-speech-recognition",
        model=en_stt_model,
        tokenizer=en_processor.tokenizer,
        feature_extractor=en_processor.feature_extractor,
        device=device if device != "cpu" else -1,
        torch_dtype=torch_dtype
    )
    logger.info("English STT model loaded successfully")
except Exception as e:
    logger.error(f"Failed to load English STT model: {e}")
    en_stt = None

logger.info("Loading Kinyarwanda TTS model...")
try:
    rw_tts_tokenizer = AutoTokenizer.from_pretrained("facebook/mms-tts-kin")
    rw_tts_model = VitsModel.from_pretrained("facebook/mms-tts-kin").to(device)
    logger.info("Kinyarwanda TTS model loaded successfully")
except Exception as e:
    logger.error(f"Failed to load Kinyarwanda TTS model: {e}")
    rw_tts_tokenizer = None
    rw_tts_model = None

logger.info("Loading English TTS model...")
try:
    en_tts_tokenizer = AutoTokenizer.from_pretrained("facebook/mms-tts-eng")
    en_tts_model = VitsModel.from_pretrained("facebook/mms-tts-eng").to(device)
    logger.info("English TTS model loaded successfully")
except Exception as e:
    logger.error(f"Failed to load English TTS model: {e}")
    en_tts_tokenizer = None
    en_tts_model = None

# ============================================================================
# TRANSLATION FUNCTION
# ============================================================================

def translate_text(text, direction):
    """
    Translate text between Kinyarwanda and English
    direction: 'en-rw' (English to Kinyarwanda) or 'rw-en' (Kinyarwanda to English)
    """
    if direction == "en-rw":
        model_id = "Helsinki-NLP/opus-mt-en-rw"
    elif direction == "rw-en":
        model_id = "Helsinki-NLP/opus-mt-rw-en"
    else:
        raise ValueError("direction must be en-rw or rw-en")

    if direction not in translation_cache:
        logger.info(f"Loading translation model for {direction}...")
        tokenizer = MarianTokenizer.from_pretrained(model_id)
        model = MarianMTModel.from_pretrained(model_id).to(device)
        translation_cache[direction] = (tokenizer, model)
        logger.info(f"Translation model {direction} loaded successfully")

    tokenizer, model = translation_cache[direction]
    inputs = tokenizer(text, return_tensors="pt", padding=True).to(device)

    with torch.no_grad():
        outputs = model.generate(**inputs, max_length=256)

    translation = tokenizer.decode(outputs[0], skip_special_tokens=True)
    return translation

# ============================================================================
# API ENDPOINTS
# ============================================================================

@app.post("/token")
@limiter.limit("10/minute")
async def get_token(request: Request):
    """
    Generate JWT token for API access
    No authentication required - returns token valid for 24 hours
    """
    try:
        token = create_access_token({"sub": "api-client"})
        return {
            "success": True,
            "access_token": token,
            "token_type": "bearer",
            "expires_in": JWT_EXPIRATION_HOURS * 3600
        }
    except Exception as e:
        logger.error(f"Error generating token: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate token")

@app.get("/health")
@limiter.limit("100/minute")
async def health(request: Request):
    """Health check endpoint - public, no auth required"""
    return {
        "status": "ready",
        "device": device,
        "models": {
            "rw_stt": "loaded" if rw_stt else "failed",
            "en_stt": "loaded" if en_stt else "failed",
            "rw_tts": "loaded" if rw_tts_model else "failed",
            "en_tts": "loaded" if en_tts_model else "failed",
        }
    }

@app.post("/stt")
@limiter.limit("10/hour")
async def stt(request: Request, audio: UploadFile = File(...), language: str = Form(...), token: dict = Depends(verify_token)):
    """
    Speech to Text endpoint (requires authentication)
    language: 'rw' for Kinyarwanda, 'en' for English
    """
    try:
        if not audio.filename:
            raise HTTPException(status_code=400, detail="No audio file provided")

        # Save uploaded file
        file_path = os.path.join(UPLOAD_DIR, str(uuid.uuid4()) + "_" + audio.filename)
        with open(file_path, "wb") as f:
            content = await audio.read()
            f.write(content)

        logger.info(f"Processing audio file: {file_path} for language: {language}")

        # Process based on language
        if language == "rw":
            if not rw_stt:
                raise HTTPException(status_code=500, detail="Kinyarwanda STT model not loaded")
            result = rw_stt(file_path, generate_kwargs={"task": "transcribe"})
        elif language == "en":
            if not en_stt:
                raise HTTPException(status_code=500, detail="English STT model not loaded")
            result = en_stt(file_path, generate_kwargs={"language": "english", "task": "transcribe"})
        else:
            raise HTTPException(status_code=400, detail="language must be 'rw' or 'en'")

        # Clean up uploaded file
        os.remove(file_path)

        return {
            "success": True,
            "language": language,
            "text": result.get("text", ""),
        }

    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error in STT endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/translate")
@limiter.limit("100/hour")
async def translate_api(request: Request, text: str = Form(...), direction: str = Form(...), token: dict = Depends(verify_token)):
    """
    Translation endpoint (requires authentication)
    direction: 'en-rw' (English to Kinyarwanda) or 'rw-en' (Kinyarwanda to English)
    Implements response caching for performance optimization
    """
    try:
        if not text:
            raise HTTPException(status_code=400, detail="No text provided")

        if direction not in ["en-rw", "rw-en"]:
            raise HTTPException(status_code=400, detail="direction must be 'en-rw' or 'rw-en'")

        # Check translation result cache first
        cache_key = f"{text.strip().lower()}:{direction}"
        if cache_key in translation_result_cache:
            logger.info(f"Cache HIT: Translation result for '{text[:30]}...' ({direction})")
            if metrics_collector:
                metrics_collector.record_cache_hit("translate")
            output = translation_result_cache[cache_key]
        else:
            logger.info(f"Cache MISS: Translating text ({direction}): {text[:50]}...")
            output = translate_text(text, direction)
            translation_result_cache[cache_key] = output
            if metrics_collector:
                metrics_collector.record_cache_miss("translate")

        return {
            "success": True,
            "direction": direction,
            "input": text,
            "translation": output,
        }

    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error in translate endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/tts-rw")
@limiter.limit("50/hour")
async def tts_rw(request: Request, text: str = Form(...), token: dict = Depends(verify_token)):
    """
    Kinyarwanda Text to Speech endpoint (requires authentication)
    """
    try:
        if not text:
            raise HTTPException(status_code=400, detail="No text provided")

        if not rw_tts_model or not rw_tts_tokenizer:
            raise HTTPException(status_code=500, detail="Kinyarwanda TTS model not loaded")

        logger.info(f"Generating Kinyarwanda speech: {text[:50]}...")

        inputs = rw_tts_tokenizer(text, return_tensors="pt").to(device)

        with torch.no_grad():
            waveform = rw_tts_model(**inputs).waveform

        output_path = os.path.join(OUTPUT_DIR, str(uuid.uuid4()) + "_rw.wav")
        sf.write(
            output_path,
            waveform.cpu().numpy().squeeze(),
            rw_tts_model.config.sampling_rate
        )

        logger.info(f"Kinyarwanda audio generated: {output_path}")

        return {
            "success": True,
            "language": "rw",
            "audio_file": output_path,
            "text": text,
        }

    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error in TTS-RW endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/tts-en")
@limiter.limit("50/hour")
async def tts_en(request: Request, text: str = Form(...), token: dict = Depends(verify_token)):
    """
    English Text to Speech endpoint (requires authentication)
    """
    try:
        if not text:
            raise HTTPException(status_code=400, detail="No text provided")

        if not en_tts_model or not en_tts_tokenizer:
            raise HTTPException(status_code=500, detail="English TTS model not loaded")

        logger.info(f"Generating English speech: {text[:50]}...")

        inputs = en_tts_tokenizer(text, return_tensors="pt").to(device)

        with torch.no_grad():
            waveform = en_tts_model(**inputs).waveform

        output_path = os.path.join(OUTPUT_DIR, str(uuid.uuid4()) + "_en.wav")
        sf.write(
            output_path,
            waveform.cpu().numpy().squeeze(),
            en_tts_model.config.sampling_rate
        )

        logger.info(f"English audio generated: {output_path}")

        return {
            "success": True,
            "language": "en",
            "audio_file": output_path,
            "text": text,
        }

    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error in TTS-EN endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/pipeline")
@limiter.limit("10/hour")
async def pipeline_all(
    request: Request,
    audio: UploadFile = File(...),
    source_language: str = Form(...),
    target_language: str = Form(...),
    token: dict = Depends(verify_token)
):
    """
    Full pipeline: STT -> Translation (requires authentication)
    source_language: 'rw' or 'en'
    target_language: 'rw' or 'en'
    """
    try:
        if source_language not in ["rw", "en"] or target_language not in ["rw", "en"]:
            raise HTTPException(status_code=400, detail="source_language and target_language must be 'rw' or 'en'")

        logger.info(f"Running full pipeline: {source_language} -> {target_language}")

        # Step 1: Speech to Text
        file_path = os.path.join(UPLOAD_DIR, str(uuid.uuid4()) + "_" + audio.filename)
        with open(file_path, "wb") as f:
            content = await audio.read()
            f.write(content)

        if source_language == "rw":
            if not rw_stt:
                raise HTTPException(status_code=500, detail="Kinyarwanda STT model not loaded")
            stt_result = rw_stt(file_path, generate_kwargs={"task": "transcribe"})
        else:
            if not en_stt:
                raise HTTPException(status_code=500, detail="English STT model not loaded")
            stt_result = en_stt(file_path, generate_kwargs={"language": "english", "task": "transcribe"})

        recognized_text = stt_result.get("text", "")
        os.remove(file_path)

        # Step 2: Translation (if source and target are different)
        if source_language == target_language:
            translated_text = recognized_text
        elif source_language == "rw" and target_language == "en":
            translated_text = translate_text(recognized_text, "rw-en")
        elif source_language == "en" and target_language == "rw":
            translated_text = translate_text(recognized_text, "en-rw")
        else:
            translated_text = recognized_text

        logger.info(f"Pipeline complete. Recognized: {recognized_text[:50]}... Translated: {translated_text[:50]}...")

        return {
            "success": True,
            "source_language": source_language,
            "target_language": target_language,
            "recognized_text": recognized_text,
            "translated_text": translated_text,
        }

    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error in pipeline endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# RECORDING & TRAINING ENDPOINTS (STT Model Fine-tuning)
# ============================================================================

@app.post("/recordings/save")
@limiter.limit("30/hour")
async def save_recording(
    request: Request,
    audio: UploadFile = File(...),
    label: str = Form(...),
    language: str = Form(...),
    token: dict = Depends(verify_token)
):
    """
    Save a labeled audio recording for LSTM STT training.
    Language: 'rw' or 'en'
    Label: text description of what was spoken
    """
    if language not in ["rw", "en"]:
        raise HTTPException(status_code=400, detail="language must be 'rw' or 'en'")
    if not label or not label.strip():
        raise HTTPException(status_code=400, detail="label is required")

    safe_label = label.strip().lower().replace(" ", "_")[:50]
    recording_id = str(uuid.uuid4())
    save_dir = os.path.join(RECORDINGS_DIR, language, safe_label)
    os.makedirs(save_dir, exist_ok=True)

    filename = f"{recording_id}.wav"
    file_path = os.path.join(save_dir, filename)

    content = await audio.read()
    with open(file_path, "wb") as f:
        f.write(content)

    meta = {
        "id": recording_id,
        "label": label.strip(),
        "safe_label": safe_label,
        "language": language,
        "filename": filename,
        "path": file_path,
        "file_size_bytes": len(content),
        "created_at": datetime.utcnow().isoformat()
    }
    meta_path = os.path.join(save_dir, f"{recording_id}.json")
    with open(meta_path, "w") as f:
        json.dump(meta, f, indent=2)

    logger.info(f"Recording saved: {file_path} label={label} lang={language}")
    return {"success": True, **meta}

@app.get("/recordings/list")
@limiter.limit("60/minute")
async def list_recordings(
    request: Request,
    language: Optional[str] = None,
    token: dict = Depends(verify_token)
):
    """
    Return all saved recordings with metadata.
    Optional: ?language=rw or ?language=en to filter by language
    """
    recordings = []
    base = Path(RECORDINGS_DIR)
    if not base.exists():
        return {"success": True, "recordings": [], "total": 0}

    lang_dirs = [base / language] if language else [d for d in base.iterdir() if d.is_dir()]
    for lang_dir in lang_dirs:
        if not lang_dir.exists():
            continue
        for label_dir in lang_dir.iterdir():
            if not label_dir.is_dir():
                continue
            for meta_file in label_dir.glob("*.json"):
                try:
                    with open(meta_file) as f:
                        meta = json.load(f)
                    meta["audio_exists"] = os.path.exists(meta.get("path", ""))
                    recordings.append(meta)
                except Exception:
                    pass

    recordings.sort(key=lambda r: r.get("created_at", ""), reverse=True)
    return {"success": True, "recordings": recordings, "total": len(recordings)}

@app.delete("/recordings/{recording_id}")
@limiter.limit("30/hour")
async def delete_recording(
    request: Request,
    recording_id: str,
    token: dict = Depends(verify_token)
):
    """
    Delete a recording by UUID.
    """
    base = Path(RECORDINGS_DIR)
    found_meta = None
    found_dir = None

    for meta_file in base.rglob(f"{recording_id}.json"):
        try:
            with open(meta_file) as f:
                found_meta = json.load(f)
            found_dir = meta_file.parent
            break
        except Exception:
            pass

    if not found_meta:
        raise HTTPException(status_code=404, detail=f"Recording {recording_id} not found")

    wav_path = os.path.join(found_dir, f"{recording_id}.wav")
    json_path = os.path.join(found_dir, f"{recording_id}.json")
    for p in [wav_path, json_path]:
        if os.path.exists(p):
            os.remove(p)

    logger.info(f"Recording deleted: {recording_id}")
    return {"success": True, "id": recording_id}

@app.post("/train")
@limiter.limit("5/hour")
async def start_training(
    request: Request,
    epochs: int = Form(default=50),
    token: dict = Depends(verify_token)
):
    """
    Start LSTM STT model training on saved recordings in background thread.
    Returns 409 if training already running.
    """
    with training_lock:
        if training_state["status"] == "running":
            raise HTTPException(status_code=409, detail="Training already in progress")

        training_state.update({
            "status": "running",
            "progress": 0,
            "current_epoch": 0,
            "total_epochs": epochs,
            "train_loss": None,
            "val_accuracy": None,
            "val_loss": None,
            "message": "Starting training...",
            "started_at": datetime.utcnow().isoformat(),
            "completed_at": None,
            "error": None,
        })

    def run_training():
        try:
            from training_service import train_lstm_model
            train_lstm_model(
                recordings_dir=RECORDINGS_DIR,
                model_output_dir="models/stt",
                epochs=epochs,
                state=training_state,
                lock=training_lock
            )
            with training_lock:
                training_state["status"] = "completed"
                training_state["completed_at"] = datetime.utcnow().isoformat()
                training_state["progress"] = 100
        except Exception as e:
            with training_lock:
                training_state["status"] = "failed"
                training_state["error"] = str(e)
                training_state["message"] = f"Training failed: {e}"
            logger.error(f"Training failed: {e}")

    thread = threading.Thread(target=run_training, daemon=True)
    thread.start()

    return {"success": True, "message": "Training started", "status": "running"}

@app.get("/train/status")
@limiter.limit("120/minute")
async def get_training_status(request: Request):
    """
    Return current training status. No authentication required for polling.
    """
    with training_lock:
        return dict(training_state)

# ============================================================================
# MONITORING ENDPOINTS
# ============================================================================

@app.get("/metrics")
@limiter.limit("100/minute")
async def get_metrics(request: Request):
    """Get comprehensive performance metrics"""
    if metrics_collector:
        return metrics_collector.get_metrics_summary()
    return {"error": "Monitoring not available"}

@app.get("/errors")
@limiter.limit("100/minute")
async def get_errors(request: Request, limit: int = 20):
    """Get recent error log"""
    if metrics_collector:
        return {
            "errors": metrics_collector.get_recent_errors(limit),
            "count": len(list(metrics_collector.error_log))
        }
    return {"errors": [], "count": 0}

@app.get("/rate-limits")
@limiter.limit("100/minute")
async def get_rate_limits(request: Request, limit: int = 20):
    """Get recent rate limit events"""
    if metrics_collector:
        return {
            "rate_limit_events": metrics_collector.get_recent_rate_limits(limit),
            "count": len(list(metrics_collector.rate_limit_log))
        }
    return {"rate_limit_events": [], "count": 0}

@app.get("/auth-failures")
@limiter.limit("100/minute")
async def get_auth_failures(request: Request, limit: int = 20):
    """Get recent authentication failures"""
    if metrics_collector:
        return {
            "auth_failures": metrics_collector.get_auth_failures(limit),
            "count": len(list(metrics_collector.auth_failures))
        }
    return {"auth_failures": [], "count": 0}

# ============================================================================
# RATE LIMITING EXCEPTION HANDLER
# ============================================================================

@app.exception_handler(RateLimitExceeded)
async def rate_limit_exception_handler(request: Request, exc: RateLimitExceeded):
    if metrics_collector:
        client_ip = request.client.host if request.client else "unknown"
        metrics_collector.record_rate_limit_hit(request.url.path, client_ip)
        logger.warning(f"Rate limit hit for {client_ip} on {request.url.path}")

    return {
        "error": "Rate limit exceeded. Too many requests.",
        "retry_after": 60
    }

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    if metrics_collector and exc.status_code == 401:
        client_ip = request.client.host if request.client else "unknown"
        metrics_collector.record_auth_failure(exc.detail or "Authentication failed", client_ip)
        logger.warning(f"Auth failure for {client_ip}: {exc.detail}")
    elif metrics_collector and exc.status_code >= 400:
        metrics_collector.record_error(request.url.path, f"HTTP{exc.status_code}", exc.detail or "Unknown error")

    return {"detail": exc.detail, "error": str(exc)}

if __name__ == "__main__":
    import uvicorn
    import ssl

    logger.info("Starting FastAPI server...")

    # Check for HTTPS configuration
    cert_file = os.getenv("SSL_CERT_FILE")
    key_file = os.getenv("SSL_KEY_FILE")
    use_ssl = cert_file and key_file and os.path.exists(cert_file) and os.path.exists(key_file)

    if use_ssl:
        logger.info(f"Starting with HTTPS (SSL/TLS)")
        uvicorn.run(
            app,
            host="127.0.0.1",
            port=8000,
            ssl_certfile=cert_file,
            ssl_keyfile=key_file,
            ssl_version=ssl.PROTOCOL_TLSv1_2
        )
    else:
        logger.info("Starting with HTTP (set SSL_CERT_FILE and SSL_KEY_FILE for HTTPS)")
        uvicorn.run(app, host="127.0.0.1", port=8000)
