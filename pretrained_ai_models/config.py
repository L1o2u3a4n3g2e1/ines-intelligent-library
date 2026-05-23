import torch
import os

# Directory paths
UPLOAD_DIR = "uploads"
OUTPUT_DIR = "outputs"
MODELS_DIR = "models"

# Create directories if they don't exist
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(MODELS_DIR, exist_ok=True)

# Device selection (CPU or CUDA)
device = "cuda:0" if torch.cuda.is_available() else "cpu"
torch_dtype = torch.float16 if torch.cuda.is_available() else torch.float32

# Log device being used
print(f"Device: {device}")
print(f"Dtype: {torch_dtype}")

# Model identifiers
MODEL_CONFIGS = {
    "rw_stt": "leophill/whisper-large-v3-sn-kinyarwanda",
    "en_stt": "openai/whisper-large-v3",
    "en_rw_translation": "Helsinki-NLP/opus-mt-en-rw",
    "rw_en_translation": "Helsinki-NLP/opus-mt-rw-en",
    "rw_tts": "facebook/mms-tts-kin",
    "en_tts": "facebook/mms-tts-eng",
}

# CORS settings
ALLOWED_ORIGINS = [
    "http://localhost",
    "http://localhost:80",
    "http://127.0.0.1",
    "http://127.0.0.1:80",
    "http://localhost:3000",  # If using dev server
]
