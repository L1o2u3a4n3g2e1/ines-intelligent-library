# LSTM Speech Recognition - Training Instructions

## 📋 Status: READY TO TRAIN

All files have been created and dependencies installed. You can now start the training process.

---

## ⚡ Quick Start (3 Steps)

### Step 1: Ensure Kaggle Setup
Kaggle credentials are required to download the dataset.

```bash
# Get your Kaggle API token
# 1. Visit: https://www.kaggle.com/settings/account
# 2. Click "Create New Token"
# 3. This downloads kaggle.json
# 4. Move it to: C:\Users\[YourUsername]\.kaggle\kaggle.json
```

### Step 2: Start Training
Run the training script from your project root:

```bash
# Option A: Simple non-interactive mode
python start_training.py

# Option B: Windows-compatible interactive mode
python digital_library/run_training_simple.py

# Option C: Direct training
python digital_library/train_lstm_kinyarwanda.py
```

### Step 3: Monitor Progress
The training will display:
```
📊 Epoch 10/100
   Train Loss: 0.3421
   Val Loss: 0.2891 | Accuracy: 92.45% | WER: 7.55%
   ✅ Best model saved!
```

---

## 📊 What Gets Created

After training completes, you'll have:

```
models/stt/
├── best_kinyarwanda_lstm.pt           (50MB model)
├── kinyarwanda_training_results.json  (metrics)
├── evaluation_report.json             (detailed analysis)
└── confusion_matrix.png               (visualization)

data/processed/
├── command_mapping_kinyarwanda.pkl    (command labels)
└── [training data]
```

---

## 🎯 Training Parameters

Current configuration in `train_lstm_kinyarwanda.py`:

| Parameter | Value | Notes |
|-----------|-------|-------|
| Sample Rate | 16kHz | Audio preprocessing |
| MFCC Features | 13 | Acoustic features |
| Sequence Length | 50 timesteps | Audio length |
| Batch Size | 16 | GPU memory balanced |
| Learning Rate | 0.001 | ADAM optimizer |
| Hidden Dim | 256 | LSTM units |
| Num Layers | 3 | Bidirectional LSTM |
| Dropout | 0.3 | Regularization |
| Epochs | 100 | Max iterations |
| Early Stopping | 15 | Patience |

---

## ⏱️ Expected Timeline

| Stage | Duration | Notes |
|-------|----------|-------|
| Kaggle Setup | 5 min | One-time |
| Dataset Download | 5-10 min | ~500MB |
| Data Preparation | 5-10 min | Feature extraction |
| **Training** | **30-60 min** | Main process |
| Evaluation | 5-10 min | Performance metrics |
| **TOTAL** | **~60-90 min** | Depends on hardware |

**GPU will be ~5-10x faster than CPU**

---

## 🚀 After Training

### 1. Check Results
```bash
# View metrics
cat models/stt/kinyarwanda_training_results.json

# View detailed report
cat models/stt/evaluation_report.json

# View confusion matrix
# Open: models/stt/confusion_matrix.png
```

### 2. Test Inference
```bash
# Interactive testing
python digital_library/test_lstm_inference.py

# Or test in Python
from digital_library.test_lstm_inference import InferencePipeline

pipeline = InferencePipeline(
    "models/stt/best_kinyarwanda_lstm.pt",
    "data/processed/command_mapping_kinyarwanda.pkl"
)

# Test on file
results = pipeline.recognize("audio.wav")
print(results)
```

### 3. Integrate with API
Replace in `voice_api.py`:

```python
# Old
from voice_recognition_service import voice_service

# New
from voice_recognition_service_enhanced import voice_service

# No other changes needed - fully backward compatible!
```

---

## 📁 Created Files Summary

### Training Scripts
- ✅ `train_lstm_kinyarwanda.py` - Main training (600+ lines)
- ✅ `kaggle_setup.py` - Kaggle integration
- ✅ `start_training.py` - Simple entry point
- ✅ `run_training_simple.py` - Windows-compatible launcher

### Evaluation & Testing
- ✅ `evaluate_lstm_model.py` - Performance evaluation
- ✅ `test_lstm_inference.py` - Interactive inference testing

### Enhanced API
- ✅ `voice_recognition_service_enhanced.py` - Production service
- ✅ `requirements_voice_enhanced.txt` - Dependencies

### Documentation
- ✅ `LSTM_SPEECH_RECOGNITION.md` - Complete guide (2000+ lines)
- ✅ `LSTM_QUICK_START.md` - Quick reference
- ✅ `TRAINING_INSTRUCTIONS.md` - This file

### Total Lines of Code
- **Training pipeline**: 600+ lines
- **Model & evaluation**: 500+ lines
- **API integration**: 400+ lines
- **Documentation**: 2000+ lines
- **Total**: 3500+ lines

---

## 🔧 Customization

To improve results, modify in `train_lstm_kinyarwanda.py`:

```python
CONFIG = {
    "batch_size": 32,              # Try 8, 16, 32, 64
    "learning_rate": 0.0005,       # Try 0.0001, 0.0005, 0.001
    "hidden_dim": 512,             # Try 128, 256, 512
    "num_layers": 4,               # Try 2, 3, 4, 5
    "epochs": 200,                 # Increase for better convergence
    "early_stopping_patience": 20, # Patience for stopping
}
```

---

## ⚠️ Common Issues

### "No CUDA support"
```
[INFO] Using device: cpu
```
This is fine! Training will work on CPU but be slower.

### "Kaggle credentials not found"
```bash
# Follow setup in Step 1 of this guide
# Or run:
python digital_library/kaggle_setup.py
```

### "No audio files found"
```bash
# Ensure dataset downloaded to:
ls digital_library/data/kinyarwanda/
# Should show speaker_001/, speaker_002/, etc.
```

### "Out of memory"
```python
# In config, reduce:
CONFIG["batch_size"] = 8  # Instead of 16
```

---

## ✅ Verification Checklist

Before starting training:

- [ ] Python 3.8+ installed
- [ ] PyTorch installed (`pip list | grep torch`)
- [ ] Kaggle credentials setup (`~/.kaggle/kaggle.json`)
- [ ] All scripts downloaded (check digital_library/ folder)
- [ ] Directories created (models/stt, data/processed)
- [ ] ~5GB free disk space
- [ ] Connection for dataset download

---

## 📞 Support

If you encounter issues:

1. **Check logs** - Training outputs detailed logs
2. **Read documentation** - See `LSTM_SPEECH_RECOGNITION.md`
3. **Review errors** - Error messages are descriptive
4. **Test dependencies** - Run `python -c "import torch; print(torch.__version__)"`

---

## 🎯 Success Criteria

Training is successful when:

✅ Model completes 100 epochs  
✅ Validation accuracy > 85%  
✅ WER < 15%  
✅ Model saved to `models/stt/best_kinyarwanda_lstm.pt`  
✅ Results saved to JSON file  

---

## 🚀 Ready?

Run one of these commands now:

```bash
# Simplest way
python start_training.py

# Or with control
python digital_library/train_lstm_kinyarwanda.py

# Or with Kaggle setup
python digital_library/kaggle_setup.py
```

---

**Status**: ✅ READY  
**Last Updated**: May 23, 2024  
**Total Setup Time**: ~2 hours (training included)
