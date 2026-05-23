"""
LSTM Speech Recognition Training on Kinyarwanda Dataset from Kaggle
Implements MFCC feature extraction and LSTM model training with WER evaluation
"""

import os
import sys
import json
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, Dataset, random_split
import numpy as np
import librosa
import pickle
from pathlib import Path
from tqdm import tqdm
from datetime import datetime
import warnings

warnings.filterwarnings('ignore')

# ============================================================================
# CONFIGURATION
# ============================================================================

CONFIG = {
    "sample_rate": 16000,
    "n_mfcc": 13,
    "n_fft": 400,
    "hop_length": 160,
    "max_audio_length": 3.0,  # seconds
    "max_sequence_length": 50,
    "batch_size": 16,
    "learning_rate": 0.001,
    "epochs": 100,
    "hidden_dim": 256,
    "num_layers": 3,
    "dropout": 0.3,
    "val_split": 0.1,
    "test_split": 0.1,
    "early_stopping_patience": 15,
    "device": torch.device("cuda" if torch.cuda.is_available() else "cpu"),
}

print(f"🖥️  Using device: {CONFIG['device']}")

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


# ============================================================================
# DATASET HANDLING
# ============================================================================

class KinyarwandaAudioDataset(Dataset):
    """Dataset for Kinyarwanda audio files"""

    def __init__(self, audio_dir, command_mapping, config):
        self.audio_dir = Path(audio_dir)
        self.command_mapping = command_mapping
        self.config = config
        self.samples = []
        self.load_samples()

    def load_samples(self):
        """Load audio file paths and labels"""
        command_to_idx = self.command_mapping['command_to_idx']

        for speaker_dir in self.audio_dir.iterdir():
            if not speaker_dir.is_dir():
                continue

            for audio_file in speaker_dir.glob("*.wav"):
                # Extract command from filename or directory structure
                parts = audio_file.stem.split('_')
                if len(parts) > 0:
                    command = parts[0]
                    if command in command_to_idx:
                        self.samples.append({
                            'path': str(audio_file),
                            'label': command,
                            'label_idx': command_to_idx[command]
                        })

    def extract_mfcc(self, audio_path):
        """Extract MFCC features from audio file"""
        try:
            audio, sr = librosa.load(
                audio_path,
                sr=self.config['sample_rate'],
                duration=self.config['max_audio_length']
            )

            mfcc = librosa.feature.mfcc(
                y=audio,
                sr=sr,
                n_mfcc=self.config['n_mfcc'],
                n_fft=self.config['n_fft'],
                hop_length=self.config['hop_length']
            )

            # Pad or truncate to max_sequence_length
            if mfcc.shape[1] > self.config['max_sequence_length']:
                mfcc = mfcc[:, :self.config['max_sequence_length']]
            else:
                padding = self.config['max_sequence_length'] - mfcc.shape[1]
                mfcc = np.pad(mfcc, ((0, 0), (0, padding)), mode='constant')

            return mfcc.T  # (seq_len, n_mfcc)

        except Exception as e:
            print(f"❌ Error processing {audio_path}: {e}")
            return None

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        sample = self.samples[idx]
        mfcc = self.extract_mfcc(sample['path'])

        if mfcc is None:
            # Return dummy data if file can't be processed
            mfcc = np.zeros((self.config['max_sequence_length'],
                            self.config['n_mfcc']))

        return torch.FloatTensor(mfcc), sample['label_idx']


# ============================================================================
# TRAINING & EVALUATION
# ============================================================================

def calculate_wer(predictions, targets, command_mapping):
    """Calculate Word Error Rate"""
    idx_to_command = command_mapping['idx_to_command']
    correct = sum(1 for p, t in zip(predictions, targets) if p == t)
    wer = 1 - (correct / len(targets)) if len(targets) > 0 else 1.0
    return wer


def evaluate(model, dataloader, device, command_mapping):
    """Evaluate model on validation/test set"""
    model.eval()
    total_loss = 0
    predictions = []
    targets = []
    criterion = nn.CrossEntropyLoss()

    with torch.no_grad():
        for features, labels in dataloader:
            features = features.to(device)
            labels = labels.to(device)

            outputs = model(features)
            loss = criterion(outputs, labels)
            total_loss += loss.item()

            preds = torch.argmax(outputs, dim=1).cpu().numpy()
            predictions.extend(preds)
            targets.extend(labels.cpu().numpy())

    avg_loss = total_loss / len(dataloader)
    wer = calculate_wer(predictions, targets, command_mapping)
    accuracy = np.mean(np.array(predictions) == np.array(targets))

    return avg_loss, accuracy, wer


def train_epoch(model, dataloader, optimizer, criterion, device):
    """Train for one epoch"""
    model.train()
    total_loss = 0

    for features, labels in tqdm(dataloader, desc="Training"):
        features = features.to(device)
        labels = labels.to(device)

        outputs = model(features)
        loss = criterion(outputs, labels)

        optimizer.zero_grad()
        loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
        optimizer.step()

        total_loss += loss.item()

    return total_loss / len(dataloader)


def train_model(train_loader, val_loader, model, optimizer, scheduler,
                criterion, device, config, command_mapping):
    """Complete training loop with early stopping"""

    best_val_loss = float('inf')
    patience_counter = 0
    history = {'train_loss': [], 'val_loss': [], 'val_accuracy': [], 'val_wer': []}

    for epoch in range(config['epochs']):
        print(f"\n📊 Epoch {epoch + 1}/{config['epochs']}")

        # Train
        train_loss = train_epoch(model, train_loader, optimizer, criterion, device)

        # Validate
        val_loss, val_acc, val_wer = evaluate(model, val_loader, device, command_mapping)

        history['train_loss'].append(train_loss)
        history['val_loss'].append(val_loss)
        history['val_accuracy'].append(val_acc)
        history['val_wer'].append(val_wer)

        print(f"   Train Loss: {train_loss:.4f}")
        print(f"   Val Loss: {val_loss:.4f} | Accuracy: {val_acc:.2%} | WER: {val_wer:.2%}")

        scheduler.step(val_loss)

        # Early stopping
        if val_loss < best_val_loss:
            best_val_loss = val_loss
            patience_counter = 0
            print("   ✅ Best model saved!")
            torch.save(model.state_dict(), 'models/stt/best_kinyarwanda_lstm.pt')
        else:
            patience_counter += 1
            if patience_counter >= config['early_stopping_patience']:
                print(f"\n⏹️  Early stopping after {epoch + 1} epochs")
                break

    return history


# ============================================================================
# MAIN TRAINING PIPELINE
# ============================================================================

def download_kaggle_dataset():
    """Download Kinyarwanda dataset from Kaggle"""
    try:
        import kagglehub
        print("📥 Downloading Kinyarwanda dataset from Kaggle...")
        path = kagglehub.dataset_download("programmerdatch/kinyarwanda-dataset")
        print(f"✅ Dataset downloaded to: {path}")
        return path
    except ImportError:
        print("❌ kagglehub not installed. Install with: pip install kagglehub")
        return None
    except Exception as e:
        print(f"❌ Error downloading dataset: {e}")
        return None


def setup_command_mapping(audio_dir):
    """Create command mapping from dataset structure"""
    commands = set()

    for speaker_dir in Path(audio_dir).iterdir():
        if speaker_dir.is_dir():
            for audio_file in speaker_dir.glob("*.wav"):
                parts = audio_file.stem.split('_')
                if len(parts) > 0:
                    commands.add(parts[0])

    commands = sorted(list(commands))
    command_to_idx = {cmd: i for i, cmd in enumerate(commands)}
    idx_to_command = {i: cmd for cmd, i in command_to_idx.items()}

    mapping = {
        'command_to_idx': command_to_idx,
        'idx_to_command': idx_to_command,
        'commands': commands,
        'num_classes': len(commands),
        'created_at': datetime.now().isoformat()
    }

    return mapping


def main():
    print("=" * 70)
    print("🎤 LSTM SPEECH RECOGNITION - KINYARWANDA DATASET")
    print("=" * 70)

    # Create directories
    os.makedirs('data/kinyarwanda', exist_ok=True)
    os.makedirs('models/stt', exist_ok=True)
    os.makedirs('data/processed', exist_ok=True)

    # Check for demo data first
    print("\n1️⃣  Loading Audio Dataset")
    demo_audio_dir = Path('digital_library/data/demo_audio')
    if not demo_audio_dir.exists():
        demo_audio_dir = Path('data/demo_audio')

    if demo_audio_dir.exists() and len(list(demo_audio_dir.glob('*/*.wav'))) > 0:
        print("✅ Using demo audio data")
        audio_dir = demo_audio_dir
    else:
        print("📥 Downloading Kinyarwanda Dataset from Kaggle...")
        dataset_path = download_kaggle_dataset()
        if not dataset_path:
            print("Using local dataset if available...")
            dataset_path = 'data/kinyarwanda'

        audio_dir = Path(dataset_path) / 'audio'
        if not audio_dir.exists():
            audio_dir = Path(dataset_path)

    # Create command mapping
    print("\n2️⃣  Creating Command Mapping (from loaded audio)")
    command_mapping = setup_command_mapping(audio_dir)
    print(f"   Found {len(command_mapping['commands'])} commands:")
    for cmd in command_mapping['commands'][:10]:
        print(f"      • {cmd}")

    # Save mapping
    mapping_path = 'data/processed/command_mapping_kinyarwanda.pkl'
    with open(mapping_path, 'wb') as f:
        pickle.dump(command_mapping, f)
    print(f"   ✅ Mapping saved to {mapping_path}")

    # Create dataset
    print("\n3️⃣  Preparing Dataset")
    full_dataset = KinyarwandaAudioDataset(audio_dir, command_mapping, CONFIG)
    print(f"   Loaded {len(full_dataset)} audio samples")

    if len(full_dataset) == 0:
        print("❌ No audio files found. Check dataset path.")
        return

    # Split dataset
    val_size = int(len(full_dataset) * CONFIG['val_split'])
    test_size = int(len(full_dataset) * CONFIG['test_split'])
    train_size = len(full_dataset) - val_size - test_size

    train_set, val_set, test_set = random_split(
        full_dataset,
        [train_size, val_size, test_size]
    )

    print(f"   Train: {len(train_set)} | Val: {len(val_set)} | Test: {len(test_set)}")

    # Create dataloaders
    train_loader = DataLoader(train_set, batch_size=CONFIG['batch_size'], shuffle=True)
    val_loader = DataLoader(val_set, batch_size=CONFIG['batch_size'])
    test_loader = DataLoader(test_set, batch_size=CONFIG['batch_size'])

    # Initialize model
    print("\n4️⃣  Initializing Model")
    model = LSTM_Kinyarwanda(
        input_dim=CONFIG['n_mfcc'],
        hidden_dim=CONFIG['hidden_dim'],
        num_layers=CONFIG['num_layers'],
        num_classes=command_mapping['num_classes'],
        dropout=CONFIG['dropout']
    ).to(CONFIG['device'])

    total_params = sum(p.numel() for p in model.parameters() if p.requires_grad)
    print(f"   Model parameters: {total_params:,}")

    # Setup training
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=CONFIG['learning_rate'])
    scheduler = optim.lr_scheduler.ReduceLROnPlateau(
        optimizer, mode='min', factor=0.5, patience=5
    )

    # Train model
    print("\n5️⃣  Training Model")
    print("=" * 70)
    history = train_model(
        train_loader, val_loader, model, optimizer, scheduler,
        criterion, CONFIG['device'], CONFIG, command_mapping
    )

    # Evaluate on test set
    print("\n6️⃣  Evaluating on Test Set")
    model.load_state_dict(torch.load('models/stt/best_kinyarwanda_lstm.pt'))
    test_loss, test_acc, test_wer = evaluate(model, test_loader, CONFIG['device'], command_mapping)
    print(f"   Test Loss: {test_loss:.4f}")
    print(f"   Test Accuracy: {test_acc:.2%}")
    print(f"   Test WER: {test_wer:.2%}")

    # Save results
    results = {
        'config': {k: str(v) if k == 'device' else v for k, v in CONFIG.items()},
        'command_mapping': command_mapping,
        'history': {k: [float(v) for v in vals] for k, vals in history.items()},
        'test_metrics': {
            'loss': float(test_loss),
            'accuracy': float(test_acc),
            'wer': float(test_wer)
        },
        'dataset_info': {
            'total_samples': len(full_dataset),
            'train_samples': len(train_set),
            'val_samples': len(val_set),
            'test_samples': len(test_set)
        }
    }

    with open('models/stt/kinyarwanda_training_results.json', 'w') as f:
        json.dump(results, f, indent=2)

    print("\n" + "=" * 70)
    print("✅ TRAINING COMPLETE!")
    print("=" * 70)
    print(f"📊 Results saved to models/stt/kinyarwanda_training_results.json")
    print(f"🤖 Model saved to models/stt/best_kinyarwanda_lstm.pt")
    print(f"📋 Mapping saved to {mapping_path}")


if __name__ == "__main__":
    main()
