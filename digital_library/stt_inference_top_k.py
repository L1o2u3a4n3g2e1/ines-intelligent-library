#!/usr/bin/env python3
"""
Speech-to-Text Inference with Top-K Results
Returns multiple recognition options with confidence scores
"""

import sys
import json
import torch
import torch.nn as nn
import numpy as np
import librosa
import pickle
from pathlib import Path
import warnings

warnings.filterwarnings('ignore')

class LSTM_Kinyarwanda(nn.Module):
    def __init__(self, input_dim=13, hidden_dim=256, num_layers=3, num_classes=16, dropout=0.3):
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


def extract_mfcc(audio_path, sample_rate=16000, n_mfcc=13, n_fft=400, hop_length=160, max_sequence_length=50):
    try:
        audio, sr = librosa.load(audio_path, sr=sample_rate, duration=3.0)
        mfcc = librosa.feature.mfcc(
            y=audio, sr=sr, n_mfcc=n_mfcc, n_fft=n_fft, hop_length=hop_length
        )
        if mfcc.shape[1] > max_sequence_length:
            mfcc = mfcc[:, :max_sequence_length]
        else:
            padding = max_sequence_length - mfcc.shape[1]
            mfcc = np.pad(mfcc, ((0, 0), (0, padding)), mode='constant')
        return mfcc.T
    except Exception:
        return None


def recognize_speech_topk(audio_file, language='en', k=3):
    try:
        model_path = Path('models/stt/best_kinyarwanda_lstm.pt')
        mapping_path = Path('data/processed/command_mapping_kinyarwanda.pkl')

        if not model_path.exists() or not mapping_path.exists():
            return {
                "error": "Model or mapping not found",
                "results": [],
                "top_result": None
            }

        with open(mapping_path, 'rb') as f:
            command_mapping = pickle.load(f)

        idx_to_command = command_mapping.get('idx_to_command', {})
        num_classes = command_mapping.get('num_classes', 16)

        device = torch.device('cpu')
        model = LSTM_Kinyarwanda(num_classes=num_classes)
        model.load_state_dict(torch.load(model_path, map_location=device))
        model.to(device)
        model.eval()

        mfcc = extract_mfcc(audio_file)
        if mfcc is None:
            return {
                "error": "Could not process audio",
                "results": [],
                "top_result": None
            }

        with torch.no_grad():
            mfcc_tensor = torch.FloatTensor(mfcc).unsqueeze(0).to(device)
            output = model(mfcc_tensor)
            probabilities = torch.softmax(output, dim=1)[0]

            top_k_probs, top_k_indices = torch.topk(probabilities, k=min(k, num_classes))

            results = []
            for prob, idx in zip(top_k_probs, top_k_indices):
                command = idx_to_command.get(idx.item(), "unknown")
                results.append({
                    "command": command,
                    "confidence": float(prob.item()),
                    "language": language
                })

            top_result = results[0] if results else None

            return {
                "results": results,
                "top_result": top_result,
                "language": language
            }

    except Exception as e:
        return {
            "error": str(e),
            "results": [],
            "top_result": None
        }


if __name__ == "__main__":
    if len(sys.argv) < 2:
        result = {"error": "Audio file path required", "results": [], "top_result": None}
    else:
        audio_file = sys.argv[1]
        language = sys.argv[2] if len(sys.argv) > 2 else 'en'
        k = int(sys.argv[3]) if len(sys.argv) > 3 else 3

        if not Path(audio_file).exists():
            result = {"error": f"Audio file not found: {audio_file}", "results": [], "top_result": None}
        else:
            result = recognize_speech_topk(audio_file, language, k)

    print(json.dumps(result))
