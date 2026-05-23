"""
Kaggle API Setup and Dataset Download Helper
Manages authentication and downloads Kinyarwanda speech dataset
"""

import os
import json
from pathlib import Path
import subprocess
import sys


def setup_kaggle_api():
    """Setup Kaggle API credentials"""

    print("=" * 70)
    print("🔐 KAGGLE API SETUP")
    print("=" * 70)

    kaggle_config_dir = Path.home() / '.kaggle'
    kaggle_config_file = kaggle_config_dir / 'kaggle.json'

    # Check if credentials already exist
    if kaggle_config_file.exists():
        print("✅ Kaggle credentials found!")
        print(f"   Location: {kaggle_config_file}")
        return True

    print("\n📋 To download the Kinyarwanda dataset, you need Kaggle API credentials:")
    print("   1. Visit: https://www.kaggle.com/settings/account")
    print("   2. Click 'Create New Token'")
    print("   3. Save the kaggle.json file")
    print()

    kaggle_json_path = input("📂 Enter path to your kaggle.json file (or press Enter to skip): ").strip()

    if not kaggle_json_path:
        print("⏭️  Skipping Kaggle setup. You can set it up later.")
        return False

    kaggle_json_path = Path(kaggle_json_path).expanduser()

    if not kaggle_json_path.exists():
        print(f"❌ File not found: {kaggle_json_path}")
        return False

    # Create .kaggle directory if it doesn't exist
    kaggle_config_dir.mkdir(parents=True, exist_ok=True)

    # Copy kaggle.json
    import shutil
    shutil.copy(kaggle_json_path, kaggle_config_file)

    # Set permissions (Linux/Mac)
    if sys.platform != 'win32':
        os.chmod(kaggle_config_file, 0o600)

    print(f"✅ Kaggle credentials saved to {kaggle_config_file}")
    return True


def download_kinyarwanda_dataset():
    """Download Kinyarwanda dataset using kagglehub"""

    print("\n" + "=" * 70)
    print("📥 DOWNLOADING KINYARWANDA DATASET")
    print("=" * 70)

    try:
        import kagglehub

        print("\n🔍 Checking for Kinyarwanda dataset on Kaggle...")
        print("   Dataset: programmerdatch/kinyarwanda-dataset")

        dataset_path = kagglehub.dataset_download(
            "programmerdatch/kinyarwanda-dataset"
        )

        print(f"\n✅ Dataset downloaded successfully!")
        print(f"   Location: {dataset_path}")

        # Check dataset structure
        dataset_path = Path(dataset_path)
        if dataset_path.exists():
            audio_files = list(dataset_path.rglob('*.wav')) + \
                          list(dataset_path.rglob('*.mp3'))
            print(f"   Audio files found: {len(audio_files)}")

        return str(dataset_path)

    except ImportError:
        print("❌ kagglehub not installed")
        print("   Install with: pip install kagglehub")
        return None
    except Exception as e:
        print(f"❌ Error downloading dataset: {e}")
        print("\n   Make sure you have:")
        print("   1. Installed kagglehub (pip install kagglehub)")
        print("   2. Set up Kaggle API credentials")
        return None


def verify_dataset_structure(dataset_path):
    """Verify and describe dataset structure"""

    if not dataset_path or not Path(dataset_path).exists():
        print("❌ Dataset path not found")
        return False

    dataset_path = Path(dataset_path)

    print("\n" + "=" * 70)
    print("📊 DATASET STRUCTURE")
    print("=" * 70)

    # Find audio files
    wav_files = list(dataset_path.rglob('*.wav'))
    mp3_files = list(dataset_path.rglob('*.mp3'))
    txt_files = list(dataset_path.rglob('*.txt'))

    print(f"\n📂 Dataset: {dataset_path.name}")
    print(f"   WAV files: {len(wav_files)}")
    print(f"   MP3 files: {len(mp3_files)}")
    print(f"   Metadata files: {len(txt_files)}")

    # Show sample structure
    if wav_files:
        print(f"\n   Sample structure:")
        for wav_file in wav_files[:5]:
            print(f"      • {wav_file.relative_to(dataset_path)}")

    # List subdirectories (speakers/categories)
    subdirs = [d for d in dataset_path.iterdir() if d.is_dir()]
    if subdirs:
        print(f"\n   Subdirectories ({len(subdirs)}):")
        for subdir in subdirs[:5]:
            files_in_subdir = len(list(subdir.rglob('*.wav'))) + \
                             len(list(subdir.rglob('*.mp3')))
            print(f"      • {subdir.name} ({files_in_subdir} files)")

    return len(wav_files) + len(mp3_files) > 0


def install_dependencies():
    """Install required Python packages"""

    print("\n" + "=" * 70)
    print("📦 INSTALLING DEPENDENCIES")
    print("=" * 70)

    packages = [
        'kagglehub>=0.2.0',
        'librosa>=0.10.0',
        'torch>=2.0.0',
        'tqdm>=4.65.0',
        'soundfile>=0.12.0',
    ]

    print("\nInstalling packages...")
    for package in packages:
        print(f"   📥 {package}...")
        try:
            subprocess.check_call(
                [sys.executable, '-m', 'pip', 'install', '-q', package]
            )
            print(f"      ✅ Installed")
        except subprocess.CalledProcessError:
            print(f"      ⚠️  Failed to install {package}")

    print("\n✅ Dependencies installation complete!")


def main():
    """Main setup workflow"""

    print("\n" + "🎤 " * 20)
    print("KINYARWANDA SPEECH RECOGNITION - SETUP WIZARD")
    print("🎤 " * 20)

    # Step 1: Install dependencies
    install_choice = input("\n1️⃣  Install Python dependencies? (y/n): ").lower()
    if install_choice == 'y':
        install_dependencies()

    # Step 2: Setup Kaggle API
    kaggle_ready = setup_kaggle_api()

    # Step 3: Download dataset
    if kaggle_ready or input("\n2️⃣  Attempt to download dataset anyway? (y/n): ").lower() == 'y':
        dataset_path = download_kinyarwanda_dataset()
        if dataset_path:
            verify_dataset_structure(dataset_path)

    print("\n" + "=" * 70)
    print("✅ SETUP COMPLETE!")
    print("=" * 70)
    print("\n📋 Next steps:")
    print("   1. Run: python train_lstm_kinyarwanda.py")
    print("   2. Monitor training progress and WER metrics")
    print("   3. Trained model will be saved to: models/stt/best_kinyarwanda_lstm.pt")
    print()


if __name__ == "__main__":
    main()
