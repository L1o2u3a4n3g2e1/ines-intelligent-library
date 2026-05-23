"""
LSTM Speech Recognition Inference Testing
Test the trained model on individual audio files
"""

import os
import sys
import torch
import torch.nn as nn
import numpy as np
import librosa
import pickle
from pathlib import Path
import wave
import pyaudio
from datetime import datetime


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


class InferencePipeline:
    """Speech recognition inference pipeline"""

    def __init__(self, model_path, mapping_path):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.config = {
            "sample_rate": 16000,
            "n_mfcc": 13,
            "n_fft": 400,
            "hop_length": 160,
            "max_audio_length": 3.0,
            "max_sequence_length": 50,
        }

        self.load_model(model_path, mapping_path)

    def load_model(self, model_path, mapping_path):
        """Load model and mappings"""

        if not Path(model_path).exists():
            raise FileNotFoundError(f"Model not found: {model_path}")

        if not Path(mapping_path).exists():
            raise FileNotFoundError(f"Mapping not found: {mapping_path}")

        with open(mapping_path, 'rb') as f:
            self.mapping = pickle.load(f)

        num_classes = len(self.mapping['idx_to_command'])

        self.model = LSTM_Kinyarwanda(num_classes=num_classes).to(self.device)
        self.model.load_state_dict(torch.load(model_path, map_location=self.device))
        self.model.eval()

        print(f"✅ Model loaded on {self.device}")
        print(f"   Commands: {len(self.mapping['command_to_idx'])}")

    def extract_mfcc(self, audio_path):
        """Extract MFCC from audio file"""

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

            max_len = self.config['max_sequence_length']
            if mfcc.shape[1] > max_len:
                mfcc = mfcc[:, :max_len]
            else:
                padding = max_len - mfcc.shape[1]
                mfcc = np.pad(mfcc, ((0, 0), (0, padding)), mode='constant')

            return mfcc.T

        except Exception as e:
            print(f"❌ Error extracting MFCC: {e}")
            return None

    def recognize(self, audio_path):
        """Recognize speech from audio file"""

        mfcc = self.extract_mfcc(audio_path)
        if mfcc is None:
            return None

        features = torch.FloatTensor(mfcc).unsqueeze(0).to(self.device)

        with torch.no_grad():
            output = self.model(features)
            probabilities = torch.softmax(output, dim=1)

        # Get top predictions
        probs_np = probabilities.cpu().numpy()[0]
        top_indices = np.argsort(probs_np)[::-1][:3]

        results = []
        for idx in top_indices:
            command = self.mapping['idx_to_command'][int(idx)]
            confidence = float(probs_np[idx])
            results.append({
                "command": command,
                "confidence": confidence
            })

        return results

    def record_and_recognize(self, duration=2, sample_rate=16000):
        """Record audio from microphone and recognize"""

        print(f"\n🎙️  Recording for {duration} seconds...")

        chunk = 1024
        format_type = pyaudio.paInt16
        channels = 1

        p = pyaudio.PyAudio()

        try:
            stream = p.open(
                format=format_type,
                channels=channels,
                rate=sample_rate,
                input=True,
                frames_per_buffer=chunk
            )

            frames = []
            for _ in range(0, int(sample_rate / chunk * duration)):
                data = stream.read(chunk)
                frames.append(data)

            stream.stop_stream()
            stream.close()

        finally:
            p.terminate()

        # Save temporary audio
        temp_file = "temp_recording.wav"
        with wave.open(temp_file, 'wb') as wf:
            wf.setnchannels(channels)
            wf.setsampwidth(p.get_sample_size(format_type))
            wf.setframerate(sample_rate)
            wf.writeframes(b''.join(frames))

        print("✅ Recording saved")

        # Recognize
        results = self.recognize(temp_file)

        # Cleanup
        os.remove(temp_file)

        return results


def test_on_file():
    """Test recognition on a file"""

    print("\n" + "=" * 70)
    print("🧪 LSTM INFERENCE TEST - FILE MODE")
    print("=" * 70)

    model_path = "models/stt/best_kinyarwanda_lstm.pt"
    mapping_path = "data/processed/command_mapping_kinyarwanda.pkl"

    try:
        pipeline = InferencePipeline(model_path, mapping_path)
    except FileNotFoundError as e:
        print(f"❌ {e}")
        return

    audio_file = input("\n📂 Enter path to audio file: ").strip()

    if not Path(audio_file).exists():
        print(f"❌ File not found: {audio_file}")
        return

    print(f"\n🔍 Processing: {audio_file}")
    results = pipeline.recognize(audio_file)

    if results:
        print("\n📊 Top 3 Predictions:")
        for i, result in enumerate(results, 1):
            print(f"   {i}. {result['command']:20} {result['confidence']*100:6.2f}%")
    else:
        print("❌ Recognition failed")


def test_on_microphone():
    """Test recognition on microphone input"""

    print("\n" + "=" * 70)
    print("🎤 LSTM INFERENCE TEST - MICROPHONE MODE")
    print("=" * 70)

    model_path = "models/stt/best_kinyarwanda_lstm.pt"
    mapping_path = "data/processed/command_mapping_kinyarwanda.pkl"

    try:
        pipeline = InferencePipeline(model_path, mapping_path)
    except FileNotFoundError as e:
        print(f"❌ {e}")
        return

    try:
        duration = int(input("\n⏱️  Recording duration (seconds, default 2): ") or "2")
    except ValueError:
        duration = 2

    results = pipeline.record_and_recognize(duration=duration)

    if results:
        print("\n📊 Top 3 Predictions:")
        for i, result in enumerate(results, 1):
            print(f"   {i}. {result['command']:20} {result['confidence']*100:6.2f}%")
    else:
        print("❌ Recognition failed")


def batch_test():
    """Test on multiple files"""

    print("\n" + "=" * 70)
    print("📁 BATCH TEST MODE")
    print("=" * 70)

    model_path = "models/stt/best_kinyarwanda_lstm.pt"
    mapping_path = "data/processed/command_mapping_kinyarwanda.pkl"

    try:
        pipeline = InferencePipeline(model_path, mapping_path)
    except FileNotFoundError as e:
        print(f"❌ {e}")
        return

    test_dir = input("\n📂 Enter test directory path: ").strip()

    if not Path(test_dir).exists():
        print(f"❌ Directory not found: {test_dir}")
        return

    # Find audio files
    audio_files = []
    for ext in ['*.wav', '*.mp3']:
        audio_files.extend(Path(test_dir).rglob(ext))

    if not audio_files:
        print(f"❌ No audio files found in {test_dir}")
        return

    print(f"\n🔍 Found {len(audio_files)} audio files")

    correct = 0
    total = 0

    for audio_file in audio_files[:20]:  # Limit to first 20
        results = pipeline.recognize(str(audio_file))

        if results:
            true_cmd = audio_file.stem.split('_')[0]
            predicted_cmd = results[0]['command']
            confidence = results[0]['confidence']

            is_correct = true_cmd == predicted_cmd
            correct += int(is_correct)
            total += 1

            status = "✅" if is_correct else "❌"
            print(f"{status} {audio_file.name:30} | Pred: {predicted_cmd:20} "
                  f"({confidence*100:5.1f}%) | True: {true_cmd}")

    if total > 0:
        accuracy = correct / total
        print(f"\n📊 Accuracy: {accuracy:.1%} ({correct}/{total})")


def main():
    print("=" * 70)
    print("🎤 LSTM SPEECH RECOGNITION - INFERENCE TEST SUITE")
    print("=" * 70)
    print("\nChoose test mode:")
    print("1. Test on single audio file")
    print("2. Test on microphone input")
    print("3. Batch test on directory")
    print("4. Exit")

    choice = input("\nEnter choice (1-4): ").strip()

    if choice == "1":
        test_on_file()
    elif choice == "2":
        test_on_microphone()
    elif choice == "3":
        batch_test()
    elif choice == "4":
        print("👋 Goodbye!")
    else:
        print("❌ Invalid choice")


if __name__ == "__main__":
    main()
