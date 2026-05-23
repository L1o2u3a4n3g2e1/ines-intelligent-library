#!/usr/bin/env python3
"""
Test the complete speech recognition system
"""

import json
import numpy as np
import soundfile as sf
from pathlib import Path
import subprocess


def create_test_audio(filename, duration=1.0, speech_type='normal'):
    """Create synthetic speech-like audio for testing"""
    sr = 16000
    t = np.linspace(0, duration, int(sr * duration))

    # Create speech-like audio with multiple frequency components
    audio = np.zeros_like(t)

    if speech_type == 'clear':
        # Clear speech with strong formants
        f1, f2, f3 = 750, 1300, 2600
        audio += 0.4 * np.sin(2 * np.pi * f1 * t)
        audio += 0.25 * np.sin(2 * np.pi * f2 * t)
        audio += 0.15 * np.sin(2 * np.pi * f3 * t)
    else:
        # Normal speech
        f1, f2, f3 = 700, 1200, 2500
        audio += 0.3 * np.sin(2 * np.pi * f1 * t)
        audio += 0.2 * np.sin(2 * np.pi * f2 * t)
        audio += 0.1 * np.sin(2 * np.pi * f3 * t)

    # Add realistic envelope
    envelope = np.hanning(len(t))
    audio = audio * envelope

    # Add some noise variation
    audio += 0.02 * np.random.randn(len(t))

    # Normalize
    audio = audio / (np.max(np.abs(audio)) + 1e-8)
    audio = audio * 0.9

    # Save
    Path('test_audio').mkdir(exist_ok=True)
    sf.write(f'test_audio/{filename}', audio, sr)
    return f'test_audio/{filename}'


def test_inference(audio_file):
    """Test the inference script"""
    print(f"\n{'='*60}")
    print(f"Testing: {audio_file}")
    print(f"{'='*60}")

    # Run inference
    result = subprocess.run(
        ['python', 'digital_library/stt_inference_working.py', audio_file],
        capture_output=True,
        text=True
    )

    if result.returncode != 0:
        print(f"ERROR: {result.stderr}")
        return None

    try:
        output = json.loads(result.stdout)
        print(f"Result: {output['recognized_text']}")
        print(f"Confidence: {output['confidence']:.2%}")
        print(f"Alternatives:")
        for alt in output.get('alternatives', []):
            print(f"  - {alt['text']} ({alt['confidence']:.2%})")
        return output
    except json.JSONDecodeError:
        print(f"JSON Error: {result.stdout}")
        return None


if __name__ == '__main__':
    print("SPEECH RECOGNITION SYSTEM TEST")
    print("="*60)

    # Create test audio files
    print("\n1. Creating test audio files...")
    audio_files = [
        create_test_audio('test1.wav', duration=0.8),
        create_test_audio('test2.wav', duration=1.2),
        create_test_audio('test3.wav', duration=0.5),
    ]
    print(f"Created {len(audio_files)} test files")

    # Test inference on each file
    print("\n2. Testing speech recognition...")
    results = []
    for audio_file in audio_files:
        result = test_inference(audio_file)
        if result:
            results.append(result)

    # Summary
    print(f"\n{'='*60}")
    print("SUMMARY")
    print(f"{'='*60}")
    print(f"Successfully recognized: {len(results)}/{len(audio_files)} audio files")

    if results:
        avg_confidence = np.mean([r['confidence'] for r in results])
        print(f"Average confidence: {avg_confidence:.2%}")
        print(f"\nRecognized commands:")
        for i, r in enumerate(results, 1):
            print(f"  {i}. {r['recognized_text']} ({r['confidence']:.2%})")

    print(f"\n{'='*60}")
    if len(results) == len(audio_files):
        print("[OK] SYSTEM WORKING - Ready for use!")
    else:
        print("[!] Some tests failed - check error messages above")
    print(f"{'='*60}\n")
