#!/usr/bin/env python3
"""
Test installation of all required packages
"""

import sys

print("=" * 60)
print("PHASE 1 VALIDATION - TESTING PACKAGE INSTALLATION")
print("=" * 60)
print()

# Test imports
packages_to_test = [
    'torch',
    'transformers',
    'fastapi',
    'uvicorn',
    'librosa',
    'soundfile',
    'scipy',
    'numpy',
    'accelerate',
    'sentencepiece',
    'pydantic',
]

print("Testing imports...")
print("-" * 60)

all_passed = True
for package in packages_to_test:
    try:
        __import__(package)
        print(f"[OK] {package:20} - OK")
    except ImportError as e:
        print(f"[FAIL] {package:20} - FAILED: {e}")
        all_passed = False

print("-" * 60)
print()

if all_passed:
    print("Testing versions...")
    print("-" * 60)
    import torch
    import transformers
    import fastapi
    import librosa

    print(f"PyTorch version:      {torch.__version__}")
    print(f"Transformers version: {transformers.__version__}")
    print(f"FastAPI version:      {fastapi.__version__}")
    print(f"Librosa version:      {librosa.__version__}")
    print()

    print("Testing device...")
    print("-" * 60)
    device = "CUDA" if torch.cuda.is_available() else "CPU"
    print(f"Available device:     {device}")
    print()

    print("=" * 60)
    print("[SUCCESS] PHASE 1 VALIDATION - ALL CHECKS PASSED!")
    print("=" * 60)
    print()
    print("Virtual environment is ready for Phase 2!")
    sys.exit(0)
else:
    print("=" * 60)
    print("[FAILED] PHASE 1 VALIDATION - SOME CHECKS FAILED!")
    print("=" * 60)
    sys.exit(1)
