#!/usr/bin/env python3
"""
LSTM Training - Direct Non-Interactive Startup
Run from command line: python start_training.py
"""

import os
import sys
from pathlib import Path

# Add project to path
sys.path.insert(0, str(Path(__file__).parent))

def main():
    print("\n" + "="*80)
    print("[*] LSTM SPEECH RECOGNITION TRAINING")
    print("="*80 + "\n")

    # Check Python version
    print("[1/6] Python: " + sys.version.split()[0])

    # Check dependencies
    print("\n[2/6] Checking dependencies...")
    try:
        import torch
        print("      - PyTorch: " + torch.__version__)
        import librosa
        print("      - Librosa: OK")
        import kagglehub
        print("      - Kagglehub: OK")
        import numpy
        print("      - NumPy: OK")
    except ImportError as e:
        print("[FAIL] Missing: " + str(e))
        return False

    # Create directories
    print("\n[3/6] Creating directories...")
    dirs = [
        'digital_library/models/stt',
        'digital_library/data/processed',
        'digital_library/data/kinyarwanda',
    ]
    for d in dirs:
        Path(d).mkdir(parents=True, exist_ok=True)
        print("      - " + d)

    # Check Kaggle
    print("\n[4/6] Checking Kaggle setup...")
    kaggle_json = Path.home() / '.kaggle' / 'kaggle.json'
    if kaggle_json.exists():
        print("      [OK] Credentials found")
    else:
        print("      [!] No credentials")
        print("      Get token from: https://www.kaggle.com/settings/account")
        print("      Save to: " + str(kaggle_json))

    # Download dataset
    print("\n[5/6] Checking dataset...")
    dataset_path = Path('digital_library/data/kinyarwanda')
    audio_files = list(dataset_path.rglob('*.wav')) + list(dataset_path.rglob('*.mp3'))
    print("      Found: " + str(len(audio_files)) + " audio files")

    if len(audio_files) < 100:
        print("      Downloading from Kaggle...")
        try:
            import kagglehub
            path = kagglehub.dataset_download("programmerdatch/kinyarwanda-dataset")
            print("      Downloaded to: " + path)
        except Exception as e:
            print("      [!] Download failed: " + str(e))
            print("      Manual download: https://www.kaggle.com/datasets/programmerdatch/kinyarwanda-dataset")

    # Start training
    print("\n[6/6] Starting LSTM Training...")
    print("\n" + "="*80)

    try:
        from digital_library.train_lstm_kinyarwanda import main as train_main
        train_main()
        return True
    except Exception as e:
        print("\n[FAIL] Training error: " + str(e))
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    try:
        success = main()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n[!] Canceled by user")
        sys.exit(1)
