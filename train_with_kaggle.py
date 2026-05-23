#!/usr/bin/env python3
"""
Speech-to-Text LSTM Training with Real Kaggle Data
Trains on Speech Commands dataset from Kaggle for production-ready results
"""

import os
import sys
import json
import torch
import torch.nn as nn
import torch.optim as optim
import numpy as np
import librosa
import pickle
from pathlib import Path
from collections import defaultdict
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
    """Extract MFCC features from audio file"""
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
    except Exception as e:
        print(f"Error processing {audio_path}: {e}")
        return None


def load_kaggle_data(data_dir='data/speech_commands'):
    """Load real speech data from Kaggle Speech Commands dataset"""
    print(f"Loading data from {data_dir}...")

    # Command categories for Kinyarwanda/English mixed
    commands = [
        'soma igitabo', 'ikurikira', 'isubire inyuma', 'subira inyuma',
        'read book', 'next page', 'previous page', 'go back',
        'play', 'pause', 'resume', 'fast forward',
        'rewind', 'stop reading', 'change language', 'help'
    ]

    command_to_idx = {cmd: idx for idx, cmd in enumerate(commands)}
    idx_to_command = {idx: cmd for cmd, idx in command_to_idx.items()}

    X, y = [], []

    # Try to load from Kaggle dataset if available
    if os.path.exists(data_dir):
        print(f"✓ Kaggle dataset found at {data_dir}")
        for cmd_dir in Path(data_dir).iterdir():
            if cmd_dir.is_dir():
                cmd_name = cmd_dir.name.replace('_', ' ')
                if cmd_name in command_to_idx:
                    cmd_idx = command_to_idx[cmd_name]
                    for audio_file in cmd_dir.glob('*.wav'):
                        mfcc = extract_mfcc(str(audio_file))
                        if mfcc is not None:
                            X.append(mfcc)
                            y.append(cmd_idx)

    # Fall back to demo data if Kaggle data not available
    if len(X) == 0:
        print("⚠ Kaggle data not found. Using demo data...")
        demo_dir = Path('digital_library/data/demo_audio')
        if demo_dir.exists():
            for cmd_idx, cmd in enumerate(commands):
                cmd_folder = demo_dir / cmd.replace(' ', '_')
                if cmd_folder.exists():
                    for audio_file in cmd_folder.glob('*.wav'):
                        mfcc = extract_mfcc(str(audio_file))
                        if mfcc is not None:
                            X.append(mfcc)
                            y.append(cmd_idx)

    if len(X) == 0:
        print("✗ No training data found!")
        return None, None, None, None

    print(f"✓ Loaded {len(X)} audio samples across {len(commands)} commands")
    return np.array(X), np.array(y), command_to_idx, idx_to_command


def train_model(X, y, command_to_idx, idx_to_command):
    """Train LSTM model on speech data"""
    print("\n" + "="*50)
    print("TRAINING LSTM SPEECH-TO-TEXT MODEL")
    print("="*50)

    num_classes = len(command_to_idx)
    device = torch.device('cpu')

    # Split data
    train_size = int(0.8 * len(X))
    val_size = int(0.1 * len(X))

    X_train = torch.FloatTensor(X[:train_size]).to(device)
    y_train = torch.LongTensor(y[:train_size]).to(device)
    X_val = torch.FloatTensor(X[train_size:train_size+val_size]).to(device)
    y_val = torch.LongTensor(y[train_size:train_size+val_size]).to(device)
    X_test = torch.FloatTensor(X[train_size+val_size:]).to(device)
    y_test = torch.LongTensor(y[train_size+val_size:]).to(device)

    print(f"Train: {len(X_train)} | Val: {len(X_val)} | Test: {len(X_test)}")

    # Initialize model
    model = LSTM_Kinyarwanda(num_classes=num_classes)
    model.to(device)

    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=0.001)
    scheduler = optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode='min', factor=0.5, patience=5)

    best_val_acc = 0
    best_model_path = 'models/stt/best_kinyarwanda_lstm.pt'
    patience = 10
    patience_counter = 0
    epochs_trained = 0

    print("\nTraining started...")
    for epoch in range(100):
        # Training
        model.train()
        optimizer.zero_grad()
        outputs = model(X_train)
        loss = criterion(outputs, y_train)
        loss.backward()
        optimizer.step()

        # Validation
        model.eval()
        with torch.no_grad():
            val_outputs = model(X_val)
            val_loss = criterion(val_outputs, y_val)
            val_preds = torch.argmax(val_outputs, dim=1)
            val_acc = (val_preds == y_val).float().mean().item()

        epochs_trained = epoch + 1

        if (epoch + 1) % 5 == 0:
            print(f"Epoch {epoch+1:3d} | Train Loss: {loss.item():.4f} | Val Loss: {val_loss.item():.4f} | Val Acc: {val_acc:.4f}")

        # Early stopping
        if val_acc > best_val_acc:
            best_val_acc = val_acc
            patience_counter = 0
            torch.save(model.state_dict(), best_model_path)
            print(f"           ✓ Saved best model (Acc: {val_acc:.4f})")
        else:
            patience_counter += 1
            if patience_counter >= patience:
                print(f"\nEarly stopping at epoch {epoch+1}")
                break

        scheduler.step(val_loss)

    # Test evaluation
    model.load_state_dict(torch.load(best_model_path))
    model.eval()
    with torch.no_grad():
        test_outputs = model(X_test)
        test_preds = torch.argmax(test_outputs, dim=1)
        test_acc = (test_preds == y_test).float().mean().item()

    # Save mapping
    mapping_path = 'data/processed/command_mapping_kinyarwanda.pkl'
    Path(mapping_path).parent.mkdir(parents=True, exist_ok=True)
    with open(mapping_path, 'wb') as f:
        pickle.dump({
            'command_to_idx': command_to_idx,
            'idx_to_command': idx_to_command,
            'num_classes': num_classes
        }, f)

    results = {
        'epochs_trained': epochs_trained,
        'best_val_accuracy': float(best_val_acc),
        'test_accuracy': float(test_acc),
        'num_classes': num_classes,
        'num_training_samples': len(X_train),
        'num_commands': len(command_to_idx)
    }

    results_path = 'models/stt/kinyarwanda_training_results.json'
    with open(results_path, 'w') as f:
        json.dump(results, f, indent=2)

    print("\n" + "="*50)
    print("TRAINING COMPLETE")
    print("="*50)
    print(f"✓ Best Model: {best_model_path}")
    print(f"✓ Mapping File: {mapping_path}")
    print(f"✓ Results: {results_path}")
    print(f"\nValidation Accuracy: {best_val_acc:.2%}")
    print(f"Test Accuracy: {test_acc:.2%}")
    print(f"Training Samples: {len(X_train)}")
    print(f"Commands: {len(command_to_idx)}")
    print("="*50)


if __name__ == '__main__':
    print("\n🎤 KINYARWANDA SPEECH-TO-TEXT TRAINING PIPELINE")
    print("Using Real Kaggle Data for Production Results\n")

    # Check for Kaggle credentials
    kaggle_config = Path.home() / '.kaggle' / 'kaggle.json'
    if not kaggle_config.exists():
        print("⚠ No Kaggle API credentials found at ~/.kaggle/kaggle.json")
        print("  To use real data:")
        print("  1. Download kaggle.json from https://www.kaggle.com/settings/account")
        print("  2. Place it in ~/.kaggle/kaggle.json")
        print("  3. Run: chmod 600 ~/.kaggle/kaggle.json")
        print("\n  Proceeding with demo data...\n")

    # Load data
    X, y, command_to_idx, idx_to_command = load_kaggle_data()

    if X is not None:
        train_model(X, y, command_to_idx, idx_to_command)
    else:
        print("✗ Failed to load training data")
        sys.exit(1)
