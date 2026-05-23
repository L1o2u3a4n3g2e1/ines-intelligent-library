# LSTM Speech Recognition - Quick Start Guide

## ⚡ 5-Minute Setup

### Step 1: Install Dependencies
```bash
cd digital-library
pip install -r digital_library/backend/requirements_voice_enhanced.txt
```

### Step 2: Setup Kaggle & Download Dataset
```bash
python digital_library/kaggle_setup.py
# Follow the prompts to:
# 1. Login to Kaggle
# 2. Download Kinyarwanda dataset
```

### Step 3: Train the Model
```bash
python digital_library/train_lstm_kinyarwanda.py
# This will take 30-60 minutes depending on your hardware
# Output: models/stt/best_kinyarwanda_lstm.pt
```

### Step 4: Evaluate Results
```bash
python digital_library/evaluate_lstm_model.py
# Shows accuracy, precision, recall, WER metrics
# Output: models/stt/evaluation_report.json
```

### Step 5: Test Inference
```bash
python digital_library/test_lstm_inference.py
# Interactive testing - choose:
# 1. Test on single file
# 2. Test on microphone
# 3. Batch test directory
```

---

## 📊 What's Included

| File | Purpose |
|------|---------|
| `train_lstm_kinyarwanda.py` | Train LSTM model on Kaggle dataset |
| `kaggle_setup.py` | Setup Kaggle API and download data |
| `evaluate_lstm_model.py` | Evaluate model performance |
| `test_lstm_inference.py` | Test model on audio files |
| `voice_recognition_service_enhanced.py` | Enhanced API service |
| `LSTM_SPEECH_RECOGNITION.md` | Detailed documentation |

---

## 🎯 Key Metrics

### Training Progress
- **Epochs**: 100 (early stopping at 15 patience)
- **Batch Size**: 16
- **Learning Rate**: 0.001
- **Hardware**: GPU recommended (CUDA)

### Target Performance
| Metric | Goal |
|--------|------|
| Accuracy | >90% |
| WER | <10% |
| Inference Speed | <300ms |

---

## 🔧 Common Commands

### Train from scratch
```bash
python digital_library/train_lstm_kinyarwanda.py
```

### Evaluate existing model
```bash
python digital_library/evaluate_lstm_model.py
```

### Test on audio file
```bash
python digital_library/test_lstm_inference.py
# Choose option 1, enter file path
```

### Test on microphone
```bash
python digital_library/test_lstm_inference.py
# Choose option 2, speak into microphone
```

### Use in Python code
```python
from voice_recognition_service_enhanced import voice_service

# Get model info
info = voice_service.get_model_info()
print(info)

# Use in async context
result = await voice_service.recognize(audio_file, language="auto")
```

---

## 📁 Files Generated After Training

```
models/stt/
├── best_kinyarwanda_lstm.pt            ← Model (50MB)
├── kinyarwanda_training_results.json   ← Training logs
└── [evaluation files]

data/processed/
├── command_mapping_kinyarwanda.pkl     ← Commands mapping
└── [training data]
```

---

## ⚠️ Troubleshooting

### "CUDA out of memory"
```python
# In train_lstm_kinyarwanda.py:
CONFIG["batch_size"] = 8  # Reduce from 16
```

### "No audio files found"
```bash
# Check dataset exists
ls -la data/kinyarwanda/
# Should see speaker_001/, speaker_002/, etc.
```

### "Model not found" during training
```bash
# Run kaggle_setup.py first
python digital_library/kaggle_setup.py
```

---

## 🚀 Next: Integration

To use in the voice API:

1. Replace import in `voice_api.py`:
```python
# From:
from voice_recognition_service import voice_service

# To:
from voice_recognition_service_enhanced import voice_service
```

2. API already works! No changes needed to routes.

3. Test with curl:
```bash
curl -X POST http://localhost:8000/api/voice/recognize \
  -F "audio=@test.wav" \
  -F "language=auto" \
  -F "detect_commands=true"
```

---

## 📊 Expected Output

### Training
```
📊 Epoch 10/100
   Train Loss: 0.3421
   Val Loss: 0.2891 | Accuracy: 92.45% | WER: 7.55%
   ✅ Best model saved!
```

### Evaluation
```
🎯 Overall Metrics:
   Accuracy: 94.23%
   WER: 5.77%
   Avg Confidence: 97.34%
```

### Inference
```
📊 Top 3 Predictions:
   1. soma igitabo            95.42%
   2. ikurikira               3.21%
   3. isubire inyuma          1.37%
```

---

## 💡 Tips for Better Accuracy

1. **Clean Audio**: Remove background noise
2. **Consistent Pronunciation**: Speak clearly
3. **More Data**: Collect more training samples
4. **Longer Training**: Train for 200+ epochs
5. **Data Augmentation**: Add noise/pitch shifts

---

## ✅ Checklist

- [ ] Dependencies installed
- [ ] Kaggle credentials setup
- [ ] Dataset downloaded (1000+ samples)
- [ ] Model trained (100 epochs)
- [ ] Evaluation completed
- [ ] Inference tested
- [ ] API integrated
- [ ] Ready for production

---

## 📚 For More Details

See **LSTM_SPEECH_RECOGNITION.md** for:
- Detailed architecture explanation
- Hyperparameter tuning guide
- Complete troubleshooting
- Performance optimization
- Integration examples

---

**Status**: ✅ Ready to use  
**Last Updated**: May 23, 2024
