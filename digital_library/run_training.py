"""
LSTM Speech Recognition - Automated Training Pipeline
Simplified startup script that guides through the entire process
"""

import os
import sys
import subprocess
from pathlib import Path
import json
from datetime import datetime


def print_header(title):
    """Print formatted header"""
    print("\n" + "=" * 80)
    print(f"🎤 {title.upper()}")
    print("=" * 80 + "\n")


def print_step(step_num, description):
    """Print step indicator"""
    print(f"\n{'='*80}")
    print(f"STEP {step_num}: {description.upper()}")
    print(f"{'='*80}\n")


def check_dependencies():
    """Check if all dependencies are installed"""
    print_step(0, "Checking Dependencies")

    required = [
        'torch',
        'librosa',
        'soundfile',
        'kagglehub',
        'numpy',
        'scipy',
        'tqdm',
        'sklearn',
        'matplotlib'
    ]

    missing = []
    for package in required:
        try:
            __import__(package)
            print(f"✅ {package}")
        except ImportError:
            print(f"❌ {package}")
            missing.append(package)

    if missing:
        print(f"\n⚠️  Missing packages: {', '.join(missing)}")
        print("\nInstalling missing dependencies...")
        try:
            subprocess.check_call([
                sys.executable, '-m', 'pip', 'install', '-q'] + missing
            )
            print("✅ Dependencies installed!")
        except subprocess.CalledProcessError:
            print("❌ Failed to install dependencies")
            return False

    return True


def check_directories():
    """Verify required directories exist"""
    print_step(1, "Checking Directory Structure")

    dirs = [
        'digital_library/models/stt',
        'digital_library/data/processed',
        'digital_library/data/kinyarwanda',
    ]

    for dir_path in dirs:
        Path(dir_path).mkdir(parents=True, exist_ok=True)
        print(f"✅ {dir_path}")

    return True


def check_kaggle_credentials():
    """Check if Kaggle credentials are set up"""
    print_step(2, "Checking Kaggle Setup")

    kaggle_json = Path.home() / '.kaggle' / 'kaggle.json'

    if kaggle_json.exists():
        print("✅ Kaggle credentials found!")
        return True
    else:
        print("❌ Kaggle credentials not found")
        print("\n📋 To set up Kaggle:")
        print("   1. Visit: https://www.kaggle.com/settings/account")
        print("   2. Click 'Create New Token'")
        print("   3. Save the kaggle.json file")
        print("\n🔧 Running setup wizard...\n")

        try:
            subprocess.check_call([
                sys.executable, 'digital_library/kaggle_setup.py'
            ])
            return True
        except Exception as e:
            print(f"⚠️  Setup wizard failed: {e}")
            print("\nYou can set up Kaggle manually later.")
            return False


def download_dataset():
    """Download Kinyarwanda dataset"""
    print_step(3, "Downloading Kinyarwanda Dataset")

    dataset_path = Path('digital_library/data/kinyarwanda')
    audio_files = list(dataset_path.rglob('*.wav')) + list(dataset_path.rglob('*.mp3'))

    if len(audio_files) > 100:
        print(f"✅ Dataset already downloaded ({len(audio_files)} audio files)")
        return True

    print("📥 Downloading dataset from Kaggle...")
    print("   This may take 5-10 minutes depending on your connection\n")

    try:
        import kagglehub
        path = kagglehub.dataset_download("programmerdatch/kinyarwanda-dataset")
        print(f"\n✅ Dataset downloaded to: {path}")

        # Move to our directory structure
        import shutil
        source = Path(path)
        dest = dataset_path

        for item in source.iterdir():
            if item.is_dir():
                shutil.copytree(item, dest / item.name, dirs_exist_ok=True)
            else:
                shutil.copy2(item, dest)

        audio_files = list(dest.rglob('*.wav')) + list(dest.rglob('*.mp3'))
        print(f"✅ Found {len(audio_files)} audio files")
        return len(audio_files) > 0

    except Exception as e:
        print(f"⚠️  Download failed: {e}")
        print("\nYou can download manually from:")
        print("   https://www.kaggle.com/datasets/programmerdatch/kinyarwanda-dataset")
        return False


def train_model():
    """Train LSTM model"""
    print_step(4, "Training LSTM Model")

    print("🚀 Starting training...")
    print("   This will take 30-60 minutes depending on your hardware")
    print("   (GPU recommended)\n")

    try:
        subprocess.check_call([
            sys.executable, 'digital_library/train_lstm_kinyarwanda.py'
        ])
        return True
    except Exception as e:
        print(f"❌ Training failed: {e}")
        return False


def evaluate_model():
    """Evaluate trained model"""
    print_step(5, "Evaluating Model")

    model_path = Path('digital_library/models/stt/best_kinyarwanda_lstm.pt')

    if not model_path.exists():
        print("❌ Model not found. Train the model first.")
        return False

    print("📊 Evaluating model performance...\n")

    try:
        subprocess.check_call([
            sys.executable, 'digital_library/evaluate_lstm_model.py'
        ])
        return True
    except Exception as e:
        print(f"⚠️  Evaluation failed: {e}")
        return False


def test_inference():
    """Test model inference"""
    print_step(6, "Testing Inference")

    model_path = Path('digital_library/models/stt/best_kinyarwanda_lstm.pt')

    if not model_path.exists():
        print("❌ Model not found. Train the model first.")
        return False

    print("🧪 Testing inference...\n")

    try:
        subprocess.check_call([
            sys.executable, 'digital_library/test_lstm_inference.py'
        ])
        return True
    except Exception as e:
        print(f"⚠️  Testing failed: {e}")
        return False


def show_results():
    """Show training results"""
    print_step("FINAL", "Training Summary")

    results_path = Path('digital_library/models/stt/kinyarwanda_training_results.json')

    if results_path.exists():
        try:
            with open(results_path) as f:
                results = json.load(f)

            metrics = results.get('test_metrics', {})

            print("✅ TRAINING COMPLETE!\n")
            print("📊 Model Performance:")
            print(f"   Accuracy: {metrics.get('accuracy', 0)*100:.2f}%")
            print(f"   WER: {metrics.get('wer', 0)*100:.2f}%")
            print(f"   Precision: {metrics.get('precision', 0)*100:.2f}%")
            print(f"   Recall: {metrics.get('recall', 0)*100:.2f}%")
            print(f"   F1-Score: {metrics.get('f1', 0)*100:.2f}%")

            print(f"\n📁 Model Location:")
            print(f"   {results_path.parent}/best_kinyarwanda_lstm.pt")

            print(f"\n📈 Full Report:")
            print(f"   {results_path}")

        except Exception as e:
            print(f"⚠️  Could not read results: {e}")
    else:
        print("ℹ️  Training results not available yet")


def main():
    """Main training pipeline"""

    print("\n" + "🎤 " * 30)
    print("LSTM SPEECH RECOGNITION - AUTOMATED TRAINING PIPELINE")
    print("🎤 " * 30)

    print("\n📋 This script will:")
    print("   1. Check dependencies")
    print("   2. Verify directory structure")
    print("   3. Setup Kaggle credentials")
    print("   4. Download Kinyarwanda dataset")
    print("   5. Train LSTM model (30-60 min)")
    print("   6. Evaluate performance")
    print("   7. Test inference")

    proceed = input("\n✅ Ready to start? (y/n): ").lower().strip()
    if proceed != 'y':
        print("👋 Canceled")
        return

    start_time = datetime.now()

    # Run steps
    steps = [
        ("Dependencies", check_dependencies),
        ("Directories", check_directories),
        ("Kaggle", check_kaggle_credentials),
        ("Dataset", download_dataset),
        ("Training", train_model),
        ("Evaluation", evaluate_model),
    ]

    completed = []
    for step_name, step_func in steps:
        try:
            if step_func():
                completed.append(step_name)
                print(f"\n✅ {step_name} completed")
            else:
                print(f"\n⚠️  {step_name} skipped or failed")
                # Ask to continue
                cont = input("\n⏯️  Continue anyway? (y/n): ").lower().strip()
                if cont != 'y':
                    break
        except KeyboardInterrupt:
            print("\n\n⏹️  Interrupted by user")
            break
        except Exception as e:
            print(f"\n❌ {step_name} error: {e}")
            cont = input("\n⏯️  Continue anyway? (y/n): ").lower().strip()
            if cont != 'y':
                break

    # Show results
    show_results()

    # Summary
    elapsed = datetime.now() - start_time
    print(f"\n⏱️  Total time: {elapsed}")
    print(f"✅ Completed steps: {', '.join(completed)}")

    print("\n" + "=" * 80)
    print("🎉 LSTM TRAINING PIPELINE COMPLETE!")
    print("=" * 80)

    print("\n📚 Next steps:")
    print("   1. Review results in models/stt/kinyarwanda_training_results.json")
    print("   2. Test on microphone: python digital_library/test_lstm_inference.py")
    print("   3. Integrate with API: voice_recognition_service_enhanced.py")
    print("   4. See LSTM_SPEECH_RECOGNITION.md for full documentation")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n👋 Interrupted")
        sys.exit(0)
