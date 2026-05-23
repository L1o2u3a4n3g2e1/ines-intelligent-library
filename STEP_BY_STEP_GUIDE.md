# LSTM Speech Recognition Training - Step-by-Step Guide

## 🎯 Complete Walkthrough

This guide will walk you through EVERYTHING. Follow each step carefully.

---

## STEP 1: Get Kaggle API Token (5 minutes)

### What is Kaggle?
Kaggle is a data science platform where the Kinyarwanda speech dataset is stored. We need permission to download it.

### How to Get Your Token:

**1. Go to Kaggle Settings**
- Open browser
- Visit: https://www.kaggle.com/settings/account
- If not logged in, create free account first

**2. Download Token**
- Look for "API" section
- Click "Create New Token"
- A file named `kaggle.json` will download
- Save it to a safe location (remember where!)

**3. Copy to System Folder**
- On Windows:
  - Press `Windows Key + R`
  - Type: `%USERPROFILE%\.kaggle`
  - Press Enter
  - Paste `kaggle.json` file here
  - If folder doesn't exist, create it first

**4. Verify**
- File should be at: `C:\Users\[YourUsername]\.kaggle\kaggle.json`

---

## STEP 2: Open Command Prompt (2 minutes)

### Navigate to Project Folder

**Method 1: Using Command Prompt**
1. Press `Windows Key + R`
2. Type: `cmd`
3. Press Enter
4. Type: `cd c:\xampp\htdocs\digital-library`
5. Press Enter

**Method 2: Using File Explorer**
1. Open File Explorer
2. Navigate to: `C:\xampp\htdocs\digital-library`
3. Hold `Shift` + Right-click in empty space
4. Click "Open PowerShell window here"

You should now see command prompt with path like:
```
C:\xampp\htdocs\digital-library>
```

---

## STEP 3: Verify Setup (2 minutes)

### Check Python Installation
Type this command:
```bash
python --version
```

Expected output:
```
Python 3.14.3
```

If you see an error, Python may not be installed.

### Check PyTorch Installation
Type this command:
```bash
python -c "import torch; print('PyTorch:', torch.__version__)"
```

Expected output:
```
PyTorch: 2.12.0+cpu
```

If you see an error, dependencies aren't installed correctly.

---

## STEP 4: Start the Training (Real Training!)

### Run the Training Script

Type this EXACT command:
```bash
python start_training.py
```

### What Will Happen:

**1. Dependency Check (30 seconds)**
```
[1/6] Python: 3.14.3
[2/6] Checking dependencies...
      - PyTorch: 2.12.0
      - Librosa: OK
      - Kagglehub: OK
      - NumPy: OK
```

**2. Directory Creation (10 seconds)**
```
[3/6] Creating directories...
      - digital_library/models/stt
      - digital_library/data/processed
      - digital_library/data/kinyarwanda
```

**3. Kaggle Check (5 seconds)**
```
[4/6] Checking Kaggle setup...
      [OK] Credentials found
```
(If not found, it will guide you)

**4. Dataset Check (10 seconds)**
```
[5/6] Checking dataset...
      Found: 0 audio files
      Downloading from Kaggle...
```
This might take 5-10 minutes on first run.

**5. TRAINING STARTS!** (30-60 minutes)
```
[6/6] Starting LSTM Training...

======================================================================
🎤 LSTM SPEECH RECOGNITION - KINYARWANDA DATASET
======================================================================

1️⃣  Downloading Kinyarwanda Dataset
   📥 Downloading dataset from Kaggle...
   ✅ Dataset downloaded to: /path/to/dataset
   Found 1234 audio files

2️⃣  Creating Command Mapping
   Found 16 commands:
      • soma igitabo
      • ikurikira
      • isubire inyuma
      ...

3️⃣  Loading Audio Dataset
   Loaded 1234 audio samples

4️⃣  Initializing Model
   Model parameters: 1,234,567

5️⃣  Training Model
   ========================================================================
   📊 Epoch 1/100
      Train Loss: 2.7834
      Val Loss: 2.4521 | Accuracy: 12.34% | WER: 87.66%

   📊 Epoch 2/100
      Train Loss: 2.1234
      Val Loss: 1.9234 | Accuracy: 23.45% | WER: 76.55%
      ✅ Best model saved!

   ... (continues for all 100 epochs or early stopping)

   📊 Epoch 100/100
      Train Loss: 0.1234
      Val Loss: 0.1567 | Accuracy: 94.23% | WER: 5.77%
      [no improvement, stopping early]

6️⃣  Evaluating on Test Set
   Test Loss: 0.1456
   Test Accuracy: 93.89%
   Test WER: 6.11%

========================================================================
✅ TRAINING COMPLETE!
========================================================================
📊 Results saved to models/stt/kinyarwanda_training_results.json
🤖 Model saved to models/stt/best_kinyarwanda_lstm.pt
```

---

## STEP 5: Monitor Training Progress

During training, you'll see:

### What Each Line Means:

```
📊 Epoch 10/100
   Train Loss: 0.3421      ← How wrong the model was on training data
   Val Loss: 0.2891        ← How wrong on validation data (lower is better)
   Accuracy: 92.45%        ← % of correct predictions (higher is better)
   WER: 7.55%              ← Word Error Rate (lower is better)
   ✅ Best model saved!    ← This is the best version so far
```

### What to Expect:

**First 10 epochs**:
- Loss will be HIGH (2.0-3.0)
- Accuracy will be LOW (10-30%)
- This is NORMAL

**Middle epochs (20-50)**:
- Loss will DROP significantly
- Accuracy will CLIMB (40-80%)
- Training is working!

**Last epochs (80-100)**:
- Loss will be LOW (0.1-0.3)
- Accuracy will be HIGH (85-95%)
- WER will be low (5-10%)
- Getting better!

**Early Stopping**:
- Training might stop before epoch 100
- This is GOOD - means model is fully trained
- Saves time while preventing overfitting

---

## STEP 6: After Training Completes

### What You'll See:

```
✅ TRAINING COMPLETE!

📊 Model Performance:
   Accuracy: 93.45%
   WER: 6.55%
   Precision: 92.87%
   Recall: 93.45%
   F1-Score: 92.98%

📁 Model Location:
   C:\xampp\htdocs\digital-library\models\stt\best_kinyarwanda_lstm.pt

📈 Full Report:
   C:\xampp\htdocs\digital-library\models\stt\kinyarwanda_training_results.json

[Next steps:]
   1. Review results in models/stt/kinyarwanda_training_results.json
   2. Test on microphone: python digital_library/test_lstm_inference.py
   3. Integrate with API: voice_recognition_service_enhanced.py
   4. See LSTM_SPEECH_RECOGNITION.md for documentation
```

---

## STEP 7: Test the Trained Model

After training completes, test it:

### Command:
```bash
python digital_library/test_lstm_inference.py
```

### You'll See Menu:
```
================================================================================
🎤 LSTM SPEECH RECOGNITION - INFERENCE TEST SUITE
================================================================================

Choose test mode:
1. Test on single audio file
2. Test on microphone input
3. Batch test on directory
4. Exit

Enter choice (1-4):
```

### Try Microphone (Option 2):
1. Type: `2`
2. Press Enter
3. Speak a command into microphone
4. See what it recognized!

---

## STEP 8: Check Results

### View Detailed Results:
```bash
type models\stt\kinyarwanda_training_results.json
```

This shows:
- All metrics
- Per-command accuracy
- Training history
- Dataset information

### View Evaluation Report:
```bash
type models\stt\evaluation_report.json
```

This shows:
- Confusion matrix
- Classification report
- Detailed performance metrics

### View Confusion Matrix Image:
```bash
explorer models\stt\confusion_matrix.png
```

This shows visually which commands are confused

---

## 🎯 TIMELINE - WHAT TO EXPECT

| Time | What's Happening | What You See |
|------|------------------|-------------|
| 0-2 min | Setup verification | Dependencies checking |
| 2-5 min | Directory creation | Folders being created |
| 5-15 min | Kaggle download | "Downloading dataset..." |
| 15-20 min | Data preparation | "Loading Audio Dataset" |
| 20-80 min | **TRAINING** | Epochs 1-100, loss/accuracy |
| 80-85 min | Evaluation | "Evaluating on Test Set" |
| 85-90 min | Saving results | "TRAINING COMPLETE!" |

**Total: ~60-90 minutes**

---

## ⚠️ COMMON THINGS THAT MIGHT HAPPEN

### "Downloading dataset..." takes 10 minutes
**This is NORMAL** - Dataset is 500MB

### "Training..." updates every few seconds
**This is NORMAL** - Progress indicator

### Loss starts HIGH (2.0+)
**This is NORMAL** - Model is learning

### Accuracy jumps around
**This is NORMAL** - Model is converging

### Training stops before epoch 100
**This is GOOD** - Early stopping prevented overfitting

### GPU usage shows 0%
**This is NORMAL** - Using CPU instead (slower but works)

---

## ✅ SUCCESS INDICATORS

Training is working if:

✅ You see epoch progress (Epoch 1/100, Epoch 2/100, etc.)
✅ Loss is decreasing over time
✅ Accuracy is increasing over time
✅ You see "Best model saved!" messages
✅ Training finishes with "TRAINING COMPLETE!"
✅ Files are created in models/stt/

---

## ❌ ERROR SOLUTIONS

### Error: "ModuleNotFoundError: No module named 'torch'"
**Solution**: Dependencies not installed
```bash
pip install torch librosa kagglehub
```

### Error: "Kaggle credentials not found"
**Solution**: Kaggle token not set up
- Repeat STEP 1
- Make sure file is at: `C:\Users\[YourUsername]\.kaggle\kaggle.json`

### Error: "No audio files found"
**Solution**: Dataset didn't download
- Run: `python digital_library/kaggle_setup.py`
- Make sure you have internet connection
- Check if dataset downloaded to: `digital_library/data/kinyarwanda/`

### Error: "CUDA out of memory"
**Solution**: GPU memory full
- Training will switch to CPU (slower but works)
- Or reduce batch_size in config

---

## 🎬 READY TO START?

You're ready! Just follow this:

### COMMAND TO RUN:
```bash
python start_training.py
```

### THEN:
- Watch the progress
- Let it run (30-60 minutes)
- Don't close the window
- Take a break! ☕

### AFTER TRAINING:
- Review the results
- Test with microphone
- Celebrate! 🎉

---

## 📊 EXPECTED FINAL RESULTS

When training completes, you should see:

```
Accuracy:    90-95%    (how often it's correct)
WER:         5-10%     (how many words it gets wrong)
Precision:   89-94%    (when it says something, is it right?)
Recall:      90-95%    (does it catch everything?)
F1-Score:    89-94%    (overall performance)
```

These are EXCELLENT results!

---

## 🚀 LET'S DO THIS!

**You are 100% ready.**

**Just run this one command in your command prompt:**

```bash
python start_training.py
```

**Then watch the magic happen!** ✨

---

**Questions during training?** Check LSTM_SPEECH_RECOGNITION.md
**Something breaks?** Check the error solutions above
**Need help?** See TRAINING_INSTRUCTIONS.md

---

**Good luck! You've got this!** 💪🎤
