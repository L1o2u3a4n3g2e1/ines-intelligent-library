"""
Create Demo Training Data for LSTM Speech Recognition
Generates synthetic audio data for demonstration
"""

import os
import numpy as np
import soundfile as sf
from pathlib import Path
import pickle

def create_synthetic_audio(duration=2.0, sample_rate=16000, noise_level=0.1):
    """Create synthetic audio data"""
    n_samples = int(duration * sample_rate)
    # Create a simple tone with some randomness
    t = np.linspace(0, duration, n_samples)
    frequency = np.random.uniform(100, 500)
    audio = np.sin(2 * np.pi * frequency * t) * 0.5
    # Add noise
    audio += np.random.normal(0, noise_level, n_samples)
    return audio.astype(np.float32)

def main():
    print("Creating Demo Training Data for LSTM...")

    # Commands
    commands = [
        "soma igitabo",
        "ikurikira",
        "isubire inyuma",
        "subira inyuma",
        "read book",
        "next page",
        "previous page",
        "go back",
        "change language",
        "stop reading",
        "start reading",
        "play",
        "pause",
        "resume",
        "fast forward",
        "rewind"
    ]

    # Create data directory
    data_dir = Path("digital_library/data/demo_audio")
    data_dir.mkdir(parents=True, exist_ok=True)

    print(f"\nGenerating {len(commands)} commands with 10 samples each...")

    # Generate audio files
    for cmd_idx, command in enumerate(commands):
        cmd_dir = data_dir / f"speaker_{cmd_idx:03d}"
        cmd_dir.mkdir(exist_ok=True)

        # Create 10 samples per command
        for sample_idx in range(10):
            audio = create_synthetic_audio()
            filename = cmd_dir / f"{command.replace(' ', '_')}_{sample_idx:03d}.wav"
            sf.write(str(filename), audio, 16000)

        print(f"  [{cmd_idx+1:2d}/{len(commands)}] {command:20} - 10 samples created")

    # Create command mapping
    mapping = {
        'command_to_idx': {cmd: i for i, cmd in enumerate(commands)},
        'idx_to_command': {i: cmd for i, cmd in enumerate(commands)},
        'commands': commands,
        'num_classes': len(commands)
    }

    mapping_path = Path("digital_library/data/processed/command_mapping_demo.pkl")
    mapping_path.parent.mkdir(parents=True, exist_ok=True)

    with open(mapping_path, 'wb') as f:
        pickle.dump(mapping, f)

    print(f"\nDemo data created!")
    print(f"  Location: {data_dir}")
    print(f"  Total samples: {len(commands) * 10}")
    print(f"  Mapping: {mapping_path}")
    print(f"\nReady for training with demo data!")

    return str(data_dir)

if __name__ == "__main__":
    main()
