"""
Enhanced Voice Recognition Service
Supports both Web Speech API (fallback) and LSTM-based custom models
Includes Kinyarwanda language support with MFCC feature extraction
"""

import os
import torch
import torch.nn as nn
import numpy as np
import librosa
import pickle
import io
import soundfile as sf
from pathlib import Path
from typing import Optional, Dict, List
import json
from datetime import datetime

# ============================================================================
# MODEL ARCHITECTURE
# ============================================================================

class LSTM_Kinyarwanda(nn.Module):
    """Bidirectional LSTM for Kinyarwanda Speech Recognition"""

    def __init__(self, input_dim=13, hidden_dim=256, num_layers=3,
                 num_classes=16, dropout=0.3):
        super(LSTM_Kinyarwanda, self).__init__()

        self.lstm = nn.LSTM(
            input_size=input_dim,
            hidden_size=hidden_dim,
            num_layers=num_layers,
            batch_first=True,
            bidirectional=True,
            dropout=dropout if num_layers > 1 else 0
        )

        self.global_avg_pool = nn.AdaptiveAvgPool1d(1)
        self.fc1 = nn.Linear(hidden_dim * 2, 128)
        self.fc2 = nn.Linear(128, num_classes)
        self.dropout = nn.Dropout(dropout)
        self.relu = nn.ReLU()

    def forward(self, x):
        lstm_out, _ = self.lstm(x)
        lstm_out = lstm_out.transpose(1, 2)
        pooled = self.global_avg_pool(lstm_out)
        pooled = pooled.squeeze(-1)
        x = self.dropout(pooled)
        x = self.relu(self.fc1(x))
        x = self.dropout(x)
        x = self.fc2(x)
        return x


class LSTM_STT(nn.Module):
    """Original LSTM STT Model (backward compatible)"""

    def __init__(self, input_dim=13, hidden_dim=256, num_layers=3,
                 num_classes=16, dropout=0.3):
        super(LSTM_STT, self).__init__()
        self.lstm = nn.LSTM(
            input_size=input_dim,
            hidden_size=hidden_dim,
            num_layers=num_layers,
            batch_first=True,
            bidirectional=True,
            dropout=dropout if num_layers > 1 else 0
        )
        self.global_avg_pool = nn.AdaptiveAvgPool1d(1)
        self.fc1 = nn.Linear(hidden_dim * 2, 128)
        self.fc2 = nn.Linear(128, num_classes)
        self.dropout = nn.Dropout(dropout)
        self.relu = nn.ReLU()

    def forward(self, x):
        lstm_out, _ = self.lstm(x)
        lstm_out = lstm_out.transpose(1, 2)
        pooled = self.global_avg_pool(lstm_out)
        pooled = pooled.squeeze(-1)
        x = self.dropout(pooled)
        x = self.relu(self.fc1(x))
        x = self.dropout(x)
        x = self.fc2(x)
        return x


# ============================================================================
# ENHANCED VOICE RECOGNITION SERVICE
# ============================================================================

class EnhancedVoiceRecognitionService:
    """
    Enhanced voice recognition with support for:
    - LSTM-based custom models (Kinyarwanda)
    - MFCC feature extraction
    - Multi-language support
    - Fallback to Web Speech API
    """

    def __init__(self):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.models = {}
        self.mappings = {}
        self.config = self._load_config()
        self.load_all_models()

    def _load_config(self) -> Dict:
        """Load configuration"""
        return {
            "sample_rate": 16000,
            "n_mfcc": 13,
            "n_fft": 400,
            "hop_length": 160,
            "max_audio_length": 3.0,
            "max_sequence_length": 50,
            "supported_languages": ["en", "rw", "auto"],
            "default_language": "rw",
            "fallback_language": "en"
        }

    def load_all_models(self):
        """Load all available models"""
        base_dir = Path(__file__).parent

        # Try loading Kinyarwanda model
        self._load_model("kinyarwanda", "best_kinyarwanda_lstm.pt",
                        "command_mapping_kinyarwanda.pkl")

        # Try loading English model
        self._load_model("english", "best_stt_model.pt",
                        "command_mapping.pkl")

        if self.models:
            print(f"✅ Loaded {len(self.models)} voice recognition model(s)")
            for lang in self.models:
                print(f"   • {lang}: {self.models[lang]['status']}")
        else:
            print("⚠️  No voice recognition models loaded")

    def _load_model(self, language: str, model_file: str, mapping_file: str):
        """Load a specific model"""
        base_dir = Path(__file__).parent
        model_path = base_dir / "models" / "stt" / model_file
        mapping_path = base_dir / "data" / "processed" / mapping_file

        try:
            if mapping_path.exists() and model_path.exists():
                with open(mapping_path, "rb") as f:
                    mapping = pickle.load(f)

                num_classes = len(mapping.get("idx_to_command", {}))

                model = LSTM_Kinyarwanda(num_classes=num_classes) \
                    if "kinyarwanda" in language.lower() \
                    else LSTM_STT(num_classes=num_classes)

                model = model.to(self.device)
                model.load_state_dict(torch.load(model_path, map_location=self.device))
                model.eval()

                self.models[language] = {
                    "model": model,
                    "status": "loaded",
                    "num_classes": num_classes,
                    "model_path": str(model_path)
                }

                self.mappings[language] = mapping

                print(f"   ✅ {language}: {num_classes} commands")

            else:
                self.models[language] = {
                    "model": None,
                    "status": "not_found",
                    "num_classes": 0,
                    "model_path": str(model_path)
                }

        except Exception as e:
            self.models[language] = {
                "model": None,
                "status": f"error: {str(e)}",
                "num_classes": 0,
                "model_path": str(model_path)
            }

    def _extract_mfcc(self, audio: np.ndarray, sr: int) -> Optional[np.ndarray]:
        """Extract MFCC features from audio"""
        try:
            mfcc = librosa.feature.mfcc(
                y=audio,
                sr=sr,
                n_mfcc=self.config['n_mfcc'],
                n_fft=self.config['n_fft'],
                hop_length=self.config['hop_length']
            )

            # Pad or truncate
            max_len = self.config['max_sequence_length']
            if mfcc.shape[1] > max_len:
                mfcc = mfcc[:, :max_len]
            else:
                padding = max_len - mfcc.shape[1]
                mfcc = np.pad(mfcc, ((0, 0), (0, padding)), mode='constant')

            return mfcc.T

        except Exception as e:
            print(f"❌ MFCC extraction error: {e}")
            return None

    def _get_best_model(self, language: str = "auto"):
        """Select best available model for language"""
        if language == "auto":
            # Prefer Kinyarwanda if available, fallback to English
            if "kinyarwanda" in self.models and \
               self.models["kinyarwanda"]["model"] is not None:
                return "kinyarwanda"
            elif "english" in self.models and \
                 self.models["english"]["model"] is not None:
                return "english"
            else:
                return None

        if language in self.models and self.models[language]["model"] is not None:
            return language

        return None

    async def recognize(self, audio_file, language: str = "auto",
                       detect_commands: bool = True) -> Dict:
        """
        Recognize speech from audio file

        Args:
            audio_file: UploadFile or file-like object
            language: Language code ("en", "rw", "auto")
            detect_commands: Whether to detect commands

        Returns:
            Dictionary with recognition results
        """

        best_lang = self._get_best_model(language)

        if best_lang is None:
            return {
                "text": "No speech recognition model available",
                "language": language,
                "confidence": 0.0,
                "model_used": "none",
                "is_command": False,
                "command_action": None,
                "error": "Model not loaded"
            }

        try:
            # Read audio
            audio_bytes = await audio_file.read()
            audio_io = io.BytesIO(audio_bytes)
            audio, sr = librosa.load(
                audio_io,
                sr=self.config['sample_rate'],
                duration=self.config['max_audio_length']
            )

            # Extract features
            mfcc = self._extract_mfcc(audio, sr)
            if mfcc is None:
                raise ValueError("Failed to extract MFCC features")

            # Run inference
            features = torch.FloatTensor(mfcc).unsqueeze(0).to(self.device)
            model = self.models[best_lang]["model"]

            with torch.no_grad():
                output = model(features)
                probabilities = torch.softmax(output, dim=1)
                confidence, predicted = torch.max(probabilities, 1)

            command = self.mappings[best_lang]["idx_to_command"].get(
                predicted.item(), "unknown"
            )

            return {
                "text": command,
                "language": best_lang,
                "confidence": float(confidence.item()),
                "model_used": "LSTM-Kinyarwanda" if best_lang == "kinyarwanda" else "LSTM-STT",
                "is_command": True,
                "command_action": command,
                "timestamp": datetime.now().isoformat()
            }

        except Exception as e:
            print(f"❌ Recognition error: {e}")
            return {
                "text": str(e),
                "language": language,
                "confidence": 0.0,
                "model_used": "none",
                "is_command": False,
                "command_action": None,
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }

    async def get_available_commands(self, language: str = "auto") -> Dict:
        """Get available commands for language"""

        best_lang = self._get_best_model(language)

        if best_lang is None:
            return {
                "language": language,
                "categories": {},
                "total_commands": 0,
                "status": "No model available"
            }

        mapping = self.mappings.get(best_lang, {})
        commands = mapping.get("commands", [])

        # Organize commands by prefix (if applicable)
        categories = {}
        for cmd in commands:
            parts = cmd.split()
            prefix = parts[0] if parts else "other"
            if prefix not in categories:
                categories[prefix] = []
            categories[prefix].append(cmd)

        return {
            "language": best_lang,
            "categories": categories,
            "total_commands": len(commands),
            "all_commands": commands,
            "status": "ready"
        }

    def get_model_info(self) -> Dict:
        """Get information about loaded models"""

        model_info = {}

        for lang, model_data in self.models.items():
            model_info[lang] = {
                "architecture": "LSTM-Bidirectional",
                "layers": 3,
                "bidirectional": True,
                "hidden_dim": 256,
                "num_classes": model_data.get("num_classes", 0),
                "status": model_data.get("status", "unknown"),
                "mfcc_features": self.config['n_mfcc'],
                "sequence_length": self.config['max_sequence_length']
            }

        return {
            "models": model_info,
            "device": str(self.device),
            "supported_languages": self.config['supported_languages'],
            "default_language": self.config['default_language'],
            "timestamp": datetime.now().isoformat()
        }

    def get_model_performance(self, language: str = "kinyarwanda") -> Optional[Dict]:
        """Get model performance metrics"""

        if language not in self.models:
            return None

        metrics_path = Path(__file__).parent / "models" / "stt" / \
                      f"{language}_training_results.json"

        if metrics_path.exists():
            try:
                with open(metrics_path, 'r') as f:
                    results = json.load(f)
                return {
                    "language": language,
                    "test_metrics": results.get("test_metrics", {}),
                    "dataset_info": results.get("dataset_info", {}),
                    "config": results.get("config", {})
                }
            except Exception as e:
                print(f"Error reading performance metrics: {e}")

        return None


# ============================================================================
# BACKWARD COMPATIBILITY
# ============================================================================

# Create singleton instance
voice_service = EnhancedVoiceRecognitionService()

# Legacy alias for backward compatibility
class VoiceRecognitionService:
    """Legacy interface - delegates to enhanced service"""

    def __init__(self):
        self.enhanced = voice_service
        self.device = voice_service.device
        self.model = None
        self.idx_to_command = {}
        self.is_loaded = bool(voice_service.models)
        self.load_model()  # for compatibility

    def load_model(self):
        """Legacy load_model for backward compatibility"""
        if "english" in voice_service.models and \
           voice_service.models["english"]["model"] is not None:
            self.model = voice_service.models["english"]["model"]
            self.idx_to_command = voice_service.mappings.get(
                "english", {}).get("idx_to_command", {})
            self.is_loaded = True

    async def recognize(self, audio_file, language="auto", detect_commands=True):
        """Legacy recognize method"""
        result = await voice_service.recognize(audio_file, language, detect_commands)

        # Convert to legacy object format
        return type('obj', (object,), result)

    async def get_available_commands(self, language="en"):
        """Legacy get_available_commands method"""
        commands = await voice_service.get_available_commands(language)
        return commands

    def get_model_info(self):
        """Legacy get_model_info method"""
        return voice_service.get_model_info()


# Maintain old singleton
voice_service_legacy = VoiceRecognitionService()
