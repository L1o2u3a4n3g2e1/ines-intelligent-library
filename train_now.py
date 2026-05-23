#!/usr/bin/env python3
"""
LSTM Training - Direct Execution Script
No interaction needed - just runs everything
"""

import sys
import os
from pathlib import Path

# Add to path
sys.path.insert(0, str(Path(__file__).parent))

def main():
    print("\n" + "="*80)
    print("[START] LSTM SPEECH RECOGNITION TRAINING")
    print("="*80 + "\n")

    # Check Kaggle
    kaggle_json = Path.home() / '.kaggle' / 'kaggle.json'

    if not kaggle_json.exists():
        print("[!] Kaggle credentials not found!")
        print("\n[SETUP REQUIRED]")
        print("   1. Go to: https://www.kaggle.com/settings/account")
        print("   2. Click: Create New Token")
        print("   3. Save kaggle.json to: " + str(kaggle_json))
        print("\n[THEN RUN THIS AGAIN]")
        return False

    print("[OK] Kaggle credentials found")

    # Check directories
    print("\n[SETUP] Creating directories...")
    dirs = [
        'digital_library/models/stt',
        'digital_library/data/processed',
        'digital_library/data/kinyarwanda',
    ]
    for d in dirs:
        Path(d).mkdir(parents=True, exist_ok=True)
        print("   - " + d)

    # Import and run training
    print("\n[IMPORT] Loading training module...")
    try:
        from digital_library.train_lstm_kinyarwanda import main as train_main
        print("[OK] Training module loaded\n")
    except Exception as e:
        print("[ERROR] Failed to import: " + str(e))
        return False

    # Start training
    print("[GO] Starting LSTM training...\n")
    print("="*80)

    try:
        train_main()
        print("\n" + "="*80)
        print("[SUCCESS] Training completed!")
        print("="*80)
        return True
    except Exception as e:
        print("\n[ERROR] Training failed: " + str(e))
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    try:
        success = main()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n[CANCELED] User interrupted training")
        sys.exit(1)
