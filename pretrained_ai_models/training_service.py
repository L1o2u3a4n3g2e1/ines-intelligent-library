"""
Training service for LSTM Speech Recognition model.
Called from app.py background thread - updates shared training_state dict.
Trains bidirectional LSTM model on labeled audio recordings.
"""

import os
import json
import pickle
import threading
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, TensorDataset, random_split
import librosa
from pathlib import Path
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

# MFCC Configuration (must match inference code)
MFCC_CONFIG = {
    "sample_rate": 16000,
    "n_mfcc": 13,
    "n_fft": 400,
    "hop_length": 160,
    "max_audio_length": 3.0,
    "max_sequence_length": 50,
}

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

# ============================================================================
# LSTM Model Architecture
# ============================================================================

class LSTM_STT(nn.Module):
    """Bidirectional LSTM for speech recognition - matches inference code"""
    def __init__(self, input_dim=13, hidden_dim=256, num_layers=3, num_classes=16, dropout=0.3):
        super(LSTM_STT, self).__init__()
        self.lstm = nn.LSTM(
            input_size=input_dim,
            hidden_size=hidden_dim,
            num_layers=num_layers,
            batch_first=True,
            bidirectional=True,
            dropout=dropout
        )
        self.pool = nn.AdaptiveAvgPool1d(1)
        self.fc1 = nn.Linear(hidden_dim * 2, 128)
        self.dropout = nn.Dropout(dropout)
        self.fc2 = nn.Linear(128, num_classes)

    def forward(self, x):
        lstm_out, _ = self.lstm(x)
        # Global average pooling: (batch, seq_len, hidden*2) -> (batch, hidden*2)
        pooled = self.pool(lstm_out.transpose(1, 2)).squeeze(-1)
        fc1_out = self.fc1(pooled)
        fc1_out = self.dropout(fc1_out)
        logits = self.fc2(fc1_out)
        return logits

# ============================================================================
# Data Loading and Preprocessing
# ============================================================================

def _extract_mfcc(audio_path):
    """Extract MFCC features from audio file"""
    try:
        y, sr = librosa.load(audio_path, sr=MFCC_CONFIG["sample_rate"], duration=MFCC_CONFIG["max_audio_length"])
        mfcc = librosa.feature.mfcc(
            y=y,
            sr=sr,
            n_mfcc=MFCC_CONFIG["n_mfcc"],
            n_fft=MFCC_CONFIG["n_fft"],
            hop_length=MFCC_CONFIG["hop_length"]
        )
        mfcc = mfcc.T  # (n_frames, n_mfcc)

        # Pad or truncate to max_sequence_length
        max_len = MFCC_CONFIG["max_sequence_length"]
        if mfcc.shape[0] < max_len:
            mfcc = np.pad(mfcc, ((0, max_len - mfcc.shape[0]), (0, 0)), mode='constant')
        else:
            mfcc = mfcc[:max_len, :]

        return mfcc.astype(np.float32)
    except Exception as e:
        logger.error(f"Error extracting MFCC from {audio_path}: {e}")
        return None

def _load_recordings(recordings_dir: str):
    """
    Walk recordings/{lang}/{label}/*.wav and load all.
    Returns: (X, y, mapping)
      X: shape (N, 50, 13) - MFCC features
      y: shape (N,) - class indices
      mapping: {"command_to_idx": {...}, "idx_to_command": {...}, "commands": [...]}
    Raises ValueError if insufficient data
    """
    X = []
    y = []
    command_to_idx = {}
    label_to_files = {}

    base = Path(recordings_dir)
    if not base.exists():
        raise ValueError(f"Recordings directory not found: {recordings_dir}")

    # Walk the directory structure
    for lang_dir in base.iterdir():
        if not lang_dir.is_dir():
            continue
        for label_dir in lang_dir.iterdir():
            if not label_dir.is_dir():
                continue

            label_name = label_dir.name
            if label_name not in command_to_idx:
                command_to_idx[label_name] = len(command_to_idx)

            label_idx = command_to_idx[label_name]
            label_to_files[label_name] = []

            for audio_file in label_dir.glob("*.wav"):
                mfcc = _extract_mfcc(str(audio_file))
                if mfcc is not None:
                    X.append(mfcc)
                    y.append(label_idx)
                    label_to_files[label_name].append(str(audio_file))

    if len(X) == 0:
        raise ValueError("No valid audio files found in recordings directory")
    if len(command_to_idx) < 2:
        raise ValueError(f"Need at least 2 distinct labels, found {len(command_to_idx)}")
    if len(X) < 10:
        raise ValueError(f"Need at least 10 total recordings, found {len(X)}")

    X = np.array(X, dtype=np.float32)  # (N, 50, 13)
    y = np.array(y, dtype=np.int64)

    idx_to_command = {v: k for k, v in command_to_idx.items()}
    mapping = {
        "command_to_idx": command_to_idx,
        "idx_to_command": idx_to_command,
        "commands": list(command_to_idx.keys()),
        "label_to_files": label_to_files
    }

    logger.info(f"Loaded {len(X)} recordings from {len(command_to_idx)} labels")
    return X, y, mapping

# ============================================================================
# Training Loop
# ============================================================================

def _update_state(state, lock, epoch, total_epochs, train_loss, val_loss, val_accuracy, message):
    """Update shared training state dict"""
    pct = int((epoch / total_epochs) * 100) if total_epochs > 0 else 0
    with lock:
        state["current_epoch"] = epoch
        state["progress"] = pct
        state["train_loss"] = round(float(train_loss), 4)
        state["val_loss"] = round(float(val_loss), 4)
        state["val_accuracy"] = round(float(val_accuracy), 4)
        state["message"] = message

def train_lstm_model(
    recordings_dir: str,
    model_output_dir: str,
    epochs: int,
    state: dict,
    lock: threading.Lock
) -> dict:
    """
    Full LSTM training pipeline:
      1. Load recordings and MFCC features
      2. Create train/val/test split (80/10/10)
      3. Train bidirectional LSTM
      4. Save best model checkpoint
      5. Return metrics

    Updates state dict throughout training for live progress monitoring.
    Raises ValueError if insufficient data.
    """
    logger.info(f"Starting STT training: {epochs} epochs, {recordings_dir} recordings")

    try:
        # Load data
        _update_state(state, lock, 0, epochs, 0.0, 0.0, 0.0, "Loading recordings...")
        X, y, mapping = _load_recordings(recordings_dir)
        num_classes = len(mapping["command_to_idx"])

        logger.info(f"Data shape: X={X.shape}, y={y.shape}, classes={num_classes}")
        _update_state(state, lock, 0, epochs, 0.0, 0.0, 0.0, f"Loaded {len(X)} recordings, {num_classes} classes")

        # Create datasets
        X_tensor = torch.FloatTensor(X)
        y_tensor = torch.LongTensor(y)
        dataset = TensorDataset(X_tensor, y_tensor)

        # 80/10/10 split
        train_size = int(0.8 * len(dataset))
        val_size = int(0.1 * len(dataset))
        test_size = len(dataset) - train_size - val_size
        train_set, val_set, test_set = random_split(dataset, [train_size, val_size, test_size])

        train_loader = DataLoader(train_set, batch_size=16, shuffle=True)
        val_loader = DataLoader(val_set, batch_size=16, shuffle=False)

        # Create model
        model = LSTM_STT(input_dim=13, hidden_dim=256, num_layers=3, num_classes=num_classes, dropout=0.3)
        model = model.to(DEVICE)

        criterion = nn.CrossEntropyLoss()
        optimizer = optim.Adam(model.parameters(), lr=0.001)
        scheduler = optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode='min', factor=0.5, patience=5, verbose=True)

        logger.info(f"Model created: {sum(p.numel() for p in model.parameters())} parameters")

        # Training loop
        best_val_loss = float('inf')
        best_epoch = 0
        patience = 10
        patience_counter = 0

        for epoch in range(1, epochs + 1):
            # Train
            model.train()
            train_loss = 0.0
            for batch_X, batch_y in train_loader:
                batch_X, batch_y = batch_X.to(DEVICE), batch_y.to(DEVICE)
                optimizer.zero_grad()
                logits = model(batch_X)
                loss = criterion(logits, batch_y)
                loss.backward()
                optimizer.step()
                train_loss += loss.item()

            train_loss /= len(train_loader)

            # Validate
            model.eval()
            val_loss = 0.0
            correct = 0
            total = 0
            with torch.no_grad():
                for batch_X, batch_y in val_loader:
                    batch_X, batch_y = batch_X.to(DEVICE), batch_y.to(DEVICE)
                    logits = model(batch_X)
                    loss = criterion(logits, batch_y)
                    val_loss += loss.item()

                    pred = logits.argmax(dim=1)
                    correct += (pred == batch_y).sum().item()
                    total += batch_y.size(0)

            val_loss /= len(val_loader)
            val_accuracy = correct / total if total > 0 else 0.0

            # Learning rate scheduling
            scheduler.step(val_loss)

            # Update progress
            _update_state(state, lock, epoch, epochs, train_loss, val_loss, val_accuracy,
                         f"Epoch {epoch}/{epochs} | Loss: {train_loss:.4f} | Val Acc: {val_accuracy:.2%}")

            logger.info(f"Epoch {epoch}/{epochs} | Train Loss: {train_loss:.4f} | Val Loss: {val_loss:.4f} | Val Acc: {val_accuracy:.2%}")

            # Save best model
            if val_loss < best_val_loss:
                best_val_loss = val_loss
                best_epoch = epoch
                patience_counter = 0

                os.makedirs(model_output_dir, exist_ok=True)
                model_path = os.path.join(model_output_dir, "best_stt_model.pt")
                torch.save(model.state_dict(), model_path)
                logger.info(f"Saved best model at epoch {epoch}: {model_path}")
            else:
                patience_counter += 1
                if patience_counter >= patience:
                    logger.info(f"Early stopping at epoch {epoch}")
                    break

        # Save training metadata
        results = {
            "best_epoch": best_epoch,
            "best_val_loss": float(best_val_loss),
            "total_epochs": epoch,
            "num_classes": num_classes,
            "mapping": mapping,
            "mfcc_config": MFCC_CONFIG,
            "completed_at": datetime.utcnow().isoformat()
        }

        results_path = os.path.join(model_output_dir, "training_results.json")
        with open(results_path, "w") as f:
            json.dump(results, f, indent=2, default=str)

        # Save command mapping pickle
        mapping_path = os.path.join(model_output_dir, "command_mapping.pkl")
        with open(mapping_path, "wb") as f:
            pickle.dump({"command_to_idx": mapping["command_to_idx"], "idx_to_command": mapping["idx_to_command"]}, f)

        logger.info(f"Training complete! Best model: {model_path}")

        with lock:
            state["status"] = "completed"
            state["completed_at"] = datetime.utcnow().isoformat()
            state["progress"] = 100
            state["message"] = f"Training complete! Best epoch: {best_epoch}"

        return results

    except ValueError as e:
        logger.error(f"Data validation error: {e}")
        with lock:
            state["status"] = "failed"
            state["error"] = str(e)
            state["message"] = f"Data error: {e}"
        raise
    except Exception as e:
        logger.error(f"Training error: {e}")
        with lock:
            state["status"] = "failed"
            state["error"] = str(e)
            state["message"] = f"Training error: {e}"
        raise
