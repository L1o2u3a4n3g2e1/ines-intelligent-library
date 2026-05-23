#!/usr/bin/env python3
"""
Production Speech-to-Text Inference
Uses trained LSTM model to recognize Kinyarwanda speech
"""

import os
import sys
import json
import torch
import numpy as np
import pickle
import librosa
from pathlib import Path


class ProductionSTTModel:
    def __init__(self, model_path='models/stt/production_kinyarwanda_lstm.pt',
                 mapping_path='data/processed/command_mapping_production.pkl'):
        self.device = torch.device('cpu')
        self.model = None
        self.command_to_idx = {}
        self.idx_to_command = {}
        self.n_mfcc = 13
        self.sequence_length = 50

        # Load model
        if os.path.exists(model_path):
            try:
                from torch import nn

                class LSTM_SpeechRecognition(nn.Module):
                    def __init__(self, input_dim=13, hidden_dim=256, num_layers=3, num_classes=16, dropout=0.3):
                        super(LSTM_SpeechRecognition, self).__init__()
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

                # Load mapping
                if os.path.exists(mapping_path):
                    with open(mapping_path, 'rb') as f:
                        mapping = pickle.load(f)
                    self.command_to_idx = mapping['command_to_idx']
                    self.idx_to_command = mapping['idx_to_command']
                    num_classes = mapping['num_classes']
                else:
                    print(f"Warning: Mapping file not found at {mapping_path}")
                    num_classes = 16

                # Initialize and load model
                self.model = LSTM_SpeechRecognition(num_classes=num_classes)
                self.model.load_state_dict(torch.load(model_path, map_location=self.device))
                self.model.to(self.device)
                self.model.eval()
                print(f"✓ Model loaded from {model_path}")
            except Exception as e:
                print(f"Error loading model: {e}")
        else:
            print(f"Warning: Model file not found at {model_path}")

    def extract_mfcc(self, audio_path, sr=16000):
        """Extract MFCC features from audio file"""
        try:
            audio, sample_rate = librosa.load(audio_path, sr=sr, duration=3.0)

            if len(audio) == 0:
                raise ValueError("Audio file is empty")

            mfcc = librosa.feature.mfcc(
                y=audio, sr=sr, n_mfcc=self.n_mfcc,
                n_fft=400, hop_length=160
            )

            # Normalize
            mfcc = (mfcc - np.mean(mfcc)) / (np.std(mfcc) + 1e-8)

            # Pad or truncate to sequence_length
            if mfcc.shape[1] > self.sequence_length:
                mfcc = mfcc[:, :self.sequence_length]
            else:
                padding = self.sequence_length - mfcc.shape[1]
                mfcc = np.pad(mfcc, ((0, 0), (0, padding)), mode='constant')

            return mfcc.T
        except Exception as e:
            raise ValueError(f"Error processing audio: {str(e)}")

    def recognize(self, audio_path, top_k=3):
        """Recognize speech from audio file"""
        if self.model is None:
            return {
                'success': False,
                'error': 'Model not loaded',
                'recognized_text': 'Error: Model not available'
            }

        try:
            # Extract features
            mfcc = self.extract_mfcc(audio_path)
            mfcc_tensor = torch.FloatTensor(mfcc).unsqueeze(0).to(self.device)

            # Inference
            with torch.no_grad():
                logits = self.model(mfcc_tensor)
                probabilities = torch.softmax(logits, dim=1)

            # Get top predictions
            top_probs, top_indices = torch.topk(probabilities, min(top_k, len(self.idx_to_command)), dim=1)

            results = []
            for prob, idx in zip(top_probs[0], top_indices[0]):
                cmd_idx = idx.item()
                confidence = prob.item()
                if cmd_idx in self.idx_to_command:
                    results.append({
                        'command': self.idx_to_command[cmd_idx],
                        'confidence': confidence
                    })

            if results:
                top_result = results[0]
                return {
                    'success': True,
                    'recognized_text': top_result['command'],
                    'command': top_result['command'],
                    'confidence': top_result['confidence'],
                    'alternatives': [
                        {'text': r['command'], 'confidence': r['confidence']}
                        for r in results[1:]
                    ]
                }
            else:
                return {
                    'success': False,
                    'error': 'No valid predictions',
                    'recognized_text': 'Could not recognize speech'
                }

        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'recognized_text': f'Error: {str(e)}'
            }


def main():
    """Test the model"""
    if len(sys.argv) < 2:
        print("Usage: python stt_inference_production.py <audio_file>")
        sys.exit(1)

    audio_path = sys.argv[1]

    # Initialize model
    model = ProductionSTTModel()

    # Recognize
    result = model.recognize(audio_path)

    # Output as JSON
    print(json.dumps(result))


if __name__ == '__main__':
    main()
