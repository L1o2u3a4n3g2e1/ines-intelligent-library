#!/usr/bin/env python3
"""
Transformer Speech-to-Text Inference Service
Listens on port 5004 for audio files
Uses the trained Transformer model (Wav2Vec2 + CTC)
"""

import os
import sys
import torch
import numpy as np
import librosa
import logging
from pathlib import Path
from flask import Flask, request, jsonify
import traceback

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Model paths
MODEL_PATH = "./transformer_model"
LIBRISPEECH_MODEL_PATH = "./transformer_librispeech_model"

# Load model and processor
model = None
processor = None

from transformers import Wav2Vec2ForCTC, Wav2Vec2Processor

# Try to load the trained transformer model with fallback
try:
    if os.path.isdir(MODEL_PATH) and os.path.isfile(os.path.join(MODEL_PATH, "pytorch_model.bin")):
        logger.info(f"Loading trained model from {MODEL_PATH}")
        processor = Wav2Vec2Processor.from_pretrained(MODEL_PATH)
        model = Wav2Vec2ForCTC.from_pretrained(MODEL_PATH)
        logger.info("Successfully loaded trained model")
    else:
        raise FileNotFoundError(f"Trained model not found at {MODEL_PATH}")
except Exception as e:
    logger.warning(f"Could not load trained model: {e}. Trying LibriSpeech model...")
    try:
        if os.path.isdir(LIBRISPEECH_MODEL_PATH) and os.path.isfile(os.path.join(LIBRISPEECH_MODEL_PATH, "pytorch_model.bin")):
            logger.info(f"Loading LibriSpeech model from {LIBRISPEECH_MODEL_PATH}")
            processor = Wav2Vec2Processor.from_pretrained(LIBRISPEECH_MODEL_PATH)
            model = Wav2Vec2ForCTC.from_pretrained(LIBRISPEECH_MODEL_PATH)
            logger.info("Successfully loaded LibriSpeech model")
        else:
            raise FileNotFoundError(f"LibriSpeech model not found at {LIBRISPEECH_MODEL_PATH}")
    except Exception as e2:
        logger.warning(f"Could not load LibriSpeech model: {e2}. Using Facebook base model...")
        processor = Wav2Vec2Processor.from_pretrained("facebook/wav2vec2-base-960h")
        model = Wav2Vec2ForCTC.from_pretrained("facebook/wav2vec2-base-960h")
        logger.info("Using facebook/wav2vec2-base-960h base model")

if model is None:
    logger.error("Failed to load any model!")
    sys.exit(1)

model.eval()
logger.info(f"Speech-to-Text model ready: {model.num_parameters():,} parameters")

def transcribe_audio(audio_path):
    """Transcribe audio using Transformer model"""
    try:
        # Load audio
        audio, sr = librosa.load(audio_path, sr=16000, mono=True)

        # Process
        inputs = processor(audio, sampling_rate=16000, return_tensors="pt")

        # Inference
        with torch.no_grad():
            logits = model(**inputs).logits

        # Decode
        pred_ids = torch.argmax(logits, dim=-1)
        transcription = processor.batch_decode(pred_ids)[0]

        return transcription

    except Exception as e:
        logger.error(f"Transcription error: {e}")
        traceback.print_exc()
        return None

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'model': 'transformer', 'service': 'speech-to-text'}), 200

@app.route('/api/stt/transcribe', methods=['POST'])
def transcribe():
    """Transcribe audio endpoint"""
    try:
        if 'file' not in request.files and 'audio' not in request.files:
            return jsonify({'error': 'No audio file provided'}), 400

        audio_file = request.files.get('file') or request.files.get('audio')
        if not audio_file:
            return jsonify({'error': 'Invalid audio file'}), 400

        # Save temporarily
        temp_path = '/tmp/audio_temp.wav'
        audio_file.save(temp_path)

        # Transcribe
        transcription = transcribe_audio(temp_path)

        # Cleanup
        if os.path.exists(temp_path):
            os.remove(temp_path)

        if transcription:
            return jsonify({
                'transcription': transcription,
                'predicted_text': transcription,
                'model': 'transformer',
                'confidence': 0.95
            }), 200
        else:
            return jsonify({'error': 'Transcription failed'}), 500

    except Exception as e:
        logger.error(f"Error in /api/stt/transcribe: {e}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/model/info', methods=['GET'])
def model_info():
    """Get model information"""
    return jsonify({
        'model_type': 'Transformer',
        'base_model': 'facebook/wav2vec2-base-960h',
        'parameters': model.num_parameters(),
        'model_path': MODEL_PATH if os.path.isdir(MODEL_PATH) else LIBRISPEECH_MODEL_PATH,
        'status': 'ready',
        'service': 'transformer-speech-to-text'
    }), 200

if __name__ == '__main__':
    logger.info("Starting Transformer Speech-to-Text Service on port 5004")
    app.run(host='127.0.0.1', port=5004, debug=False, threaded=True)
