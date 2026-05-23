"""
Evaluation Script for LSTM Speech Recognition Models
Tests model performance on test set and calculates detailed metrics
"""

import os
import json
import torch
import torch.nn as nn
import numpy as np
import librosa
import pickle
from pathlib import Path
from tqdm import tqdm
from sklearn.metrics import (
    confusion_matrix,
    classification_report,
    accuracy_score,
    precision_score,
    recall_score,
    f1_score
)
import matplotlib.pyplot as plt
import seaborn as sns
import warnings

warnings.filterwarnings('ignore')


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


def load_model_and_mapping(model_path, mapping_path):
    """Load trained model and command mapping"""

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    with open(mapping_path, 'rb') as f:
        mapping = pickle.load(f)

    num_classes = len(mapping['idx_to_command'])

    model = LSTM_Kinyarwanda(num_classes=num_classes).to(device)
    model.load_state_dict(torch.load(model_path, map_location=device))
    model.eval()

    return model, mapping, device


def extract_mfcc(audio_path, sr=16000, n_mfcc=13, n_fft=400,
                hop_length=160, max_len=50, duration=3.0):
    """Extract MFCC features from audio file"""

    try:
        audio, _ = librosa.load(audio_path, sr=sr, duration=duration)

        mfcc = librosa.feature.mfcc(
            y=audio,
            sr=sr,
            n_mfcc=n_mfcc,
            n_fft=n_fft,
            hop_length=hop_length
        )

        if mfcc.shape[1] > max_len:
            mfcc = mfcc[:, :max_len]
        else:
            padding = max_len - mfcc.shape[1]
            mfcc = np.pad(mfcc, ((0, 0), (0, padding)), mode='constant')

        return mfcc.T

    except Exception as e:
        print(f"Error processing {audio_path}: {e}")
        return None


def evaluate_model(model, test_audio_dir, mapping, device, num_samples=None):
    """Evaluate model on test audio files"""

    print("\n" + "=" * 70)
    print("🧪 EVALUATING MODEL")
    print("=" * 70)

    model.eval()
    predictions = []
    ground_truth = []
    confidences = []
    correct_by_command = {}
    total_by_command = {}

    idx_to_command = mapping['idx_to_command']
    command_to_idx = mapping['command_to_idx']

    # Collect all audio files
    audio_files = []
    for ext in ['*.wav', '*.mp3']:
        audio_files.extend(Path(test_audio_dir).rglob(ext))

    if num_samples:
        audio_files = audio_files[:num_samples]

    print(f"Testing on {len(audio_files)} audio files")

    with torch.no_grad():
        for audio_path in tqdm(audio_files, desc="Processing"):
            mfcc = extract_mfcc(str(audio_path))

            if mfcc is None:
                continue

            # Get true label from filename or directory
            parts = audio_path.stem.split('_')
            true_command = parts[0] if parts else "unknown"

            if true_command not in command_to_idx:
                continue

            true_idx = command_to_idx[true_command]

            # Predict
            features = torch.FloatTensor(mfcc).unsqueeze(0).to(device)
            output = model(features)
            probabilities = torch.softmax(output, dim=1)
            confidence, predicted_idx = torch.max(probabilities, 1)

            pred_idx = predicted_idx.item()
            conf = confidence.item()

            predictions.append(pred_idx)
            ground_truth.append(true_idx)
            confidences.append(conf)

            # Track per-command accuracy
            if true_command not in correct_by_command:
                correct_by_command[true_command] = 0
                total_by_command[true_command] = 0

            total_by_command[true_command] += 1
            if pred_idx == true_idx:
                correct_by_command[true_command] += 1

    # Calculate metrics
    if len(predictions) == 0:
        print("❌ No audio files were processed")
        return None

    accuracy = accuracy_score(ground_truth, predictions)
    precision = precision_score(ground_truth, predictions, average='weighted', zero_division=0)
    recall = recall_score(ground_truth, predictions, average='weighted', zero_division=0)
    f1 = f1_score(ground_truth, predictions, average='weighted', zero_division=0)

    # Word Error Rate (1 - accuracy)
    wer = 1 - accuracy

    results = {
        "overall_metrics": {
            "accuracy": float(accuracy),
            "precision": float(precision),
            "recall": float(recall),
            "f1_score": float(f1),
            "wer": float(wer),
            "average_confidence": float(np.mean(confidences)),
            "num_samples": len(predictions)
        },
        "per_command_metrics": {},
        "confusion_matrix": confusion_matrix(ground_truth, predictions).tolist(),
        "classification_report": classification_report(
            ground_truth, predictions, output_dict=True, zero_division=0
        )
    }

    # Per-command accuracy
    for cmd in command_to_idx:
        idx = command_to_idx[cmd]
        if cmd in total_by_command:
            cmd_accuracy = correct_by_command.get(cmd, 0) / total_by_command[cmd]
            results["per_command_metrics"][cmd] = {
                "accuracy": float(cmd_accuracy),
                "correct": int(correct_by_command.get(cmd, 0)),
                "total": int(total_by_command[cmd])
            }

    return results, predictions, ground_truth, confidences


def print_evaluation_results(results):
    """Print formatted evaluation results"""

    print("\n" + "=" * 70)
    print("📊 EVALUATION RESULTS")
    print("=" * 70)

    metrics = results["overall_metrics"]

    print(f"\n🎯 Overall Metrics:")
    print(f"   Accuracy: {metrics['accuracy']:.2%}")
    print(f"   Precision: {metrics['precision']:.2%}")
    print(f"   Recall: {metrics['recall']:.2%}")
    print(f"   F1-Score: {metrics['f1_score']:.2%}")
    print(f"   WER: {metrics['wer']:.2%}")
    print(f"   Avg Confidence: {metrics['average_confidence']:.2%}")
    print(f"   Samples: {metrics['num_samples']}")

    print(f"\n📋 Per-Command Accuracy:")
    for cmd, metrics_cmd in sorted(results["per_command_metrics"].items()):
        acc = metrics_cmd['accuracy']
        correct = metrics_cmd['correct']
        total = metrics_cmd['total']
        bar = "█" * int(acc * 20) + "░" * (20 - int(acc * 20))
        print(f"   {cmd:20} {bar} {acc:6.1%} ({correct}/{total})")


def save_evaluation_report(results, output_path):
    """Save evaluation results to JSON file"""

    with open(output_path, 'w') as f:
        json.dump(results, f, indent=2)

    print(f"\n💾 Results saved to: {output_path}")


def plot_confusion_matrix(cm, labels, output_path):
    """Plot and save confusion matrix"""

    plt.figure(figsize=(12, 10))
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues',
                xticklabels=labels, yticklabels=labels)
    plt.title('Confusion Matrix - Kinyarwanda Speech Recognition')
    plt.ylabel('True Label')
    plt.xlabel('Predicted Label')
    plt.tight_layout()
    plt.savefig(output_path, dpi=100)
    print(f"📊 Confusion matrix saved to: {output_path}")
    plt.close()


def main():
    print("=" * 70)
    print("🧪 MODEL EVALUATION - KINYARWANDA SPEECH RECOGNITION")
    print("=" * 70)

    # Paths
    model_path = "models/stt/best_kinyarwanda_lstm.pt"
    mapping_path = "data/processed/command_mapping_kinyarwanda.pkl"
    test_audio_dir = "data/kinyarwanda"  # Adjust to your test directory

    if not Path(model_path).exists():
        print(f"❌ Model not found: {model_path}")
        return

    if not Path(mapping_path).exists():
        print(f"❌ Mapping not found: {mapping_path}")
        return

    # Load model
    print("\n1️⃣  Loading Model")
    model, mapping, device = load_model_and_mapping(model_path, mapping_path)
    print(f"   Model loaded on {device}")
    print(f"   Commands: {len(mapping['command_to_idx'])}")

    # Evaluate
    print("\n2️⃣  Evaluating Model")
    evaluation = evaluate_model(model, test_audio_dir, mapping, device)

    if evaluation is None:
        return

    results, predictions, ground_truth, confidences = evaluation

    # Print results
    print_evaluation_results(results)

    # Save results
    print("\n3️⃣  Saving Results")
    report_path = "models/stt/evaluation_report.json"
    save_evaluation_report(results, report_path)

    # Plot confusion matrix
    cm = np.array(results['confusion_matrix'])
    labels = [mapping['idx_to_command'][i] for i in range(len(mapping['idx_to_command']))]
    cm_path = "models/stt/confusion_matrix.png"
    plot_confusion_matrix(cm, labels, cm_path)

    print("\n" + "=" * 70)
    print("✅ EVALUATION COMPLETE!")
    print("=" * 70)


if __name__ == "__main__":
    main()
