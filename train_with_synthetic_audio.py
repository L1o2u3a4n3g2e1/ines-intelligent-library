#!/usr/bin/env python3
"""
Train production model with synthetic audio files
Creates realistic speech-like audio and trains on MFCC features
"""

import os
import json
import torch
import torch.nn as nn
import torch.optim as optim
import numpy as np
import librosa
import soundfile as sf
from pathlib import Path
import pickle
import warnings

warnings.filterwarnings('ignore')


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


def generate_synthetic_audio(command_idx, variation, sr=16000, duration=1.0):
    """Generate realistic synthetic speech audio"""
    t = np.linspace(0, duration, int(sr * duration))

    # Create command-specific base frequency
    base_freq = 100 + (command_idx % 16) * 30

    # Create realistic speech-like audio with formants
    audio = np.zeros_like(t)

    # First formant (vowel-like)
    f1 = base_freq
    audio += 0.4 * np.sin(2 * np.pi * f1 * t)

    # Second formant
    f2 = base_freq * 2.5 + variation * 50
    audio += 0.3 * np.sin(2 * np.pi * f2 * t)

    # Third formant
    f3 = base_freq * 3.5 + variation * 30
    audio += 0.2 * np.sin(2 * np.pi * f3 * t)

    # Add variation with noise
    audio += 0.05 * np.random.randn(len(t))

    # Envelope (onset, sustain, offset)
    envelope = np.ones_like(t)
    onset = int(sr * 0.1)
    offset_start = int(sr * 0.8)
    envelope[:onset] = np.linspace(0, 1, onset)
    envelope[offset_start:] = np.linspace(1, 0, len(t) - offset_start)

    audio = audio * envelope

    # Normalize
    audio = audio / (np.max(np.abs(audio)) + 1e-8)
    audio = audio * 0.95

    return audio


def create_training_dataset():
    """Create training dataset with synthetic audio"""
    print("Generating synthetic audio dataset...")

    dict_path = Path('data/kinyarwanda_dictionary.json')
    with open(dict_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    commands = data['commands']
    command_list = list(commands.keys())
    command_to_idx = {cmd: idx for idx, cmd in enumerate(command_list)}
    idx_to_command = {idx: cmd for cmd, idx in command_to_idx.items()}

    # Create audio directory
    audio_dir = Path('data/speech_commands_synthetic')
    audio_dir.mkdir(parents=True, exist_ok=True)

    sr = 16000
    X = []
    y = []

    print(f"\nGenerating {len(command_list)} commands x 20 variations = {len(command_list) * 20} samples")

    for cmd_idx, cmd in enumerate(command_list):
        for var in range(20):  # 20 variations per command
            # Generate audio
            audio = generate_synthetic_audio(cmd_idx, var, sr=sr)

            # Save audio file
            audio_path = audio_dir / f"cmd_{cmd_idx:02d}_var_{var:02d}.wav"
            sf.write(str(audio_path), audio, sr)

            # Extract MFCC
            mfcc = librosa.feature.mfcc(
                y=audio, sr=sr, n_mfcc=13,
                n_fft=400, hop_length=160
            )

            # Normalize MFCC
            mfcc = (mfcc - np.mean(mfcc, axis=1, keepdims=True)) / (np.std(mfcc, axis=1, keepdims=True) + 1e-8)

            # Pad to 50 frames
            if mfcc.shape[1] < 50:
                mfcc = np.pad(mfcc, ((0, 0), (0, 50 - mfcc.shape[1])), mode='constant')
            else:
                mfcc = mfcc[:, :50]

            X.append(mfcc.T)
            y.append(cmd_idx)

        if (cmd_idx + 1) % 5 == 0:
            print(f"  [OK] Generated {cmd_idx + 1}/{len(command_list)} commands")

    print(f"[OK] Generated {len(X)} audio samples")
    return np.array(X), np.array(y), command_to_idx, idx_to_command


def train_model(X, y, command_to_idx, idx_to_command):
    """Train LSTM model"""
    print("\n" + "="*60)
    print("TRAINING LSTM MODEL ON SYNTHETIC AUDIO")
    print("="*60)

    num_classes = len(command_to_idx)
    device = torch.device('cpu')

    # Split data
    total = len(X)
    train_idx = int(0.8 * total)
    val_idx = int(0.9 * total)

    X_train = torch.FloatTensor(X[:train_idx]).to(device)
    y_train = torch.LongTensor(y[:train_idx]).to(device)
    X_val = torch.FloatTensor(X[train_idx:val_idx]).to(device)
    y_val = torch.LongTensor(y[train_idx:val_idx]).to(device)
    X_test = torch.FloatTensor(X[val_idx:]).to(device)
    y_test = torch.LongTensor(y[val_idx:]).to(device)

    print(f"\nTrain: {len(X_train)} | Val: {len(X_val)} | Test: {len(X_test)}")

    # Model
    model = LSTM_SpeechRecognition(num_classes=num_classes)
    model.to(device)

    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=0.001)
    scheduler = optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode='min', factor=0.5, patience=5)

    best_val_acc = 0
    best_model_path = 'models/stt/production_kinyarwanda_lstm.pt'
    patience = 15
    patience_counter = 0

    Path(best_model_path).parent.mkdir(parents=True, exist_ok=True)

    print("\nTraining...")
    for epoch in range(100):
        model.train()
        optimizer.zero_grad()
        outputs = model(X_train)
        loss = criterion(outputs, y_train)
        loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
        optimizer.step()

        model.eval()
        with torch.no_grad():
            val_outputs = model(X_val)
            val_loss = criterion(val_outputs, y_val)
            val_preds = torch.argmax(val_outputs, dim=1)
            val_acc = (val_preds == y_val).float().mean().item()

        if (epoch + 1) % 5 == 0:
            print(f"Epoch {epoch+1:3d} | Loss: {loss.item():.4f} | Val Loss: {val_loss.item():.4f} | Val Acc: {val_acc:.2%}")

        if val_acc > best_val_acc:
            best_val_acc = val_acc
            patience_counter = 0
            torch.save(model.state_dict(), best_model_path)
            print(f"           [OK] Model saved (Acc: {val_acc:.2%})")
        else:
            patience_counter += 1
            if patience_counter >= patience:
                print(f"\n[OK] Early stopping at epoch {epoch+1}")
                break

        scheduler.step(val_loss)

    # Test
    model.load_state_dict(torch.load(best_model_path))
    model.eval()
    with torch.no_grad():
        test_outputs = model(X_test)
        test_preds = torch.argmax(test_outputs, dim=1)
        test_acc = (test_preds == y_test).float().mean().item()

    # Save mapping
    mapping_path = 'data/processed/command_mapping_production.pkl'
    Path(mapping_path).parent.mkdir(parents=True, exist_ok=True)
    with open(mapping_path, 'wb') as f:
        pickle.dump({
            'command_to_idx': command_to_idx,
            'idx_to_command': idx_to_command,
            'num_classes': num_classes
        }, f)

    results = {
        'model': 'Production LSTM (Synthetic Audio)',
        'epochs_trained': epoch + 1,
        'best_val_accuracy': float(best_val_acc),
        'test_accuracy': float(test_acc),
        'num_classes': num_classes,
        'num_training_samples': len(X_train),
        'num_commands': len(command_to_idx)
    }

    results_path = 'models/stt/production_training_results.json'
    with open(results_path, 'w') as f:
        json.dump(results, f, indent=2)

    print("\n" + "="*60)
    print("[OK] TRAINING COMPLETE")
    print("="*60)
    print(f"Model:    {best_model_path}")
    print(f"Accuracy: {best_val_acc:.2%} (validation), {test_acc:.2%} (test)")
    print(f"Commands: {len(command_to_idx)}")
    print("="*60)


if __name__ == '__main__':
    X, y, command_to_idx, idx_to_command = create_training_dataset()
    if X is not None and len(X) > 0:
        train_model(X, y, command_to_idx, idx_to_command)
