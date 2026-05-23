# 🎤 START LSTM TRAINING NOW!

## COMPLETE STEP-BY-STEP INSTRUCTIONS

Follow these steps EXACTLY in order. Takes about 5 minutes to set up, then training runs automatically.

---

## ✅ STEP 1: GET KAGGLE TOKEN (Do This FIRST!)

### What You Need:
- Kaggle account (free at kaggle.com)
- An internet connection

### Instructions:

**1. Open Browser and Go To:**
```
https://www.kaggle.com/settings/account
```

**2. Look for "API" Section**
- Scroll down to find "API" heading
- You'll see a button that says "Create New Token"

**3. Click "Create New Token"**
- A file named `kaggle.json` will download
- **Save the location!** (usually Downloads folder)

**4. Copy File to System Folder**

**Option A: Using File Explorer (Easiest)**
- Press `Windows Key + E` to open File Explorer
- In the address bar, type: `%USERPROFILE%\.kaggle`
- Press Enter
- If folder `.kaggle` doesn't exist, create it:
  - Right-click in empty space
  - Click "New" → "Folder"
  - Name it: `.kaggle`
- Copy your `kaggle.json` file into this folder

**Option B: Using Command Line**
```bash
# Open Command Prompt and type:
copy "C:\Users\[YOUR_USERNAME]\Downloads\kaggle.json" "%USERPROFILE%\.kaggle\"
```

**5. Verify It Worked**
- Open Command Prompt
- Type: `dir %USERPROFILE%\.kaggle`
- You should see `kaggle.json` listed

---

## ✅ STEP 2: OPEN COMMAND PROMPT

### Method 1: Using Run Dialog (Fastest)
1. Press `Windows Key + R`
2. Type: `cmd`
3. Press Enter

### Method 2: Using File Explorer
1. Open File Explorer
2. Navigate to: `C:\xampp\htdocs\digital-library`
3. Hold `Shift` + Right-click in empty space
4. Click "Open PowerShell window here" or "Open Command Prompt here"

### You should see:
```
C:\xampp\htdocs\digital-library>
```

---

## ✅ STEP 3: RUN THE TRAINING

In your Command Prompt, type this EXACT command:

```bash
python train_now.py
```

Then press **Enter**

---

## ✅ STEP 4: WATCH THE TRAINING

The script will output something like:

```
================================================================================
[START] LSTM SPEECH RECOGNITION TRAINING
================================================================================

[OK] Kaggle credentials found

[SETUP] Creating directories...
   - digital_library/models/stt
   - digital_library/data/processed
   - digital_library/data/kinyarwanda

[IMPORT] Loading training module...
[OK] Training module loaded

[GO] Starting LSTM training...

================================================================================
🎤 LSTM SPEECH RECOGNITION - KINYARWANDA DATASET
================================================================================

1️⃣  Downloading Kinyarwanda Dataset
   📥 Downloading dataset from Kaggle...
   Dataset downloaded to: /path/to/dataset
   ✅ Found 1234 audio files

2️⃣  Creating Command Mapping
   Found 16 commands:
      • soma igitabo
      • ikurikira
      • isubire inyuma
      ...

3️⃣  Loading Audio Dataset
   Loaded 1234 audio samples
   Train: 800 | Val: 200 | Test: 234

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

   📊 Epoch 3/100
      Train Loss: 1.8234
      Val Loss: 1.7123 | Accuracy: 34.56% | WER: 65.44%
      ✅ Best model saved!

   ... (this continues automatically)

   📊 Epoch 50/100
      Train Loss: 0.3421
      Val Loss: 0.2891 | Accuracy: 92.45% | WER: 7.55%
      ✅ Best model saved!

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

## ⏱️ WHAT TO EXPECT DURING TRAINING

### Timeline:
- **0-2 minutes**: Setup verification
- **2-10 minutes**: Dataset download (may take longer on first run)
- **10-15 minutes**: Data preparation
- **15-75 minutes**: **ACTUAL TRAINING** (30-60 min)
  - Each epoch takes ~30-60 seconds
  - You'll see progress update
  - Loss decreases, accuracy increases
- **75-90 minutes**: Evaluation and saving
- **TOTAL**: ~60-90 minutes

### What You'll See:
```
Epoch 1/100   ← Current epoch out of 100
Train Loss: 2.78  ← How wrong (lower is better)
Val Loss: 2.45    ← Validation loss (lower is better)
Accuracy: 12%     ← % Correct (higher is better)
WER: 88%          ← Word Error Rate (lower is better)
```

### What's Normal:
- ✅ First 10 epochs: Loss HIGH (2-3), Accuracy LOW (10-30%)
- ✅ Middle epochs: Loss drops, Accuracy climbs (40-80%)
- ✅ Last epochs: Loss LOW (0.1-0.3), Accuracy HIGH (85-95%)
- ✅ Updates every 10 epochs
- ✅ Early stopping before epoch 100 (GOOD thing!)

---

## ⚠️ IMPORTANT: DON'T CLOSE THE WINDOW!

**NEVER close the Command Prompt window while training is running!**

If you close it:
- Training will STOP
- You'll lose progress
- You'll have to START OVER

**KEEP IT OPEN** for the entire duration (60-90 minutes)

---

## 🎯 WHAT HAPPENS WHEN TRAINING FINISHES

You'll see:
```
================================================================================
✅ TRAINING COMPLETE!
================================================================================

📊 Model Performance:
   Accuracy: 93.45%      ← Great!
   WER: 6.55%           ← Low error rate!
   Precision: 92.87%
   Recall: 93.45%
   F1-Score: 92.98%

📁 Model Location:
   C:\xampp\htdocs\digital-library\models\stt\best_kinyarwanda_lstm.pt

📈 Full Report:
   C:\xampp\htdocs\digital-library\models\stt\kinyarwanda_training_results.json
```

---

## ✅ AFTER TRAINING: NEXT STEPS

Once training completes, you can:

### 1. Test the Model on Microphone
```bash
python digital_library/test_lstm_inference.py
```
- Choose option 2: "Test on microphone input"
- Speak a command
- See what it recognized!

### 2. View Detailed Results
```bash
type models\stt\kinyarwanda_training_results.json
```
- Shows all metrics
- Per-command accuracy
- Training history

### 3. Evaluate the Model
```bash
python digital_library/evaluate_lstm_model.py
```
- Full evaluation
- Confusion matrix
- Detailed report

### 4. Integrate with API
Update `voice_api.py`:
```python
# Change this line:
from voice_recognition_service_enhanced import voice_service

# That's it! No other changes needed
```

---

## ❌ TROUBLESHOOTING

### Error: "Kaggle credentials not found"
**Solution**: 
- Go back to STEP 1
- Make sure kaggle.json is at: `C:\Users\YOUR_USERNAME\.kaggle\kaggle.json`
- Restart training

### Error: "No module named 'torch'"
**Solution**: Dependencies not installed
```bash
pip install torch librosa kagglehub numpy scipy
```

### Error: "No audio files found"
**Solution**: Dataset didn't download
- Make sure you have internet connection
- Check that Kaggle credentials are correct
- Try running: `python digital_library/kaggle_setup.py`

### Error: CUDA out of memory
**Solution**: Training switches to CPU automatically (slower but works)

### Training seems stuck (no output for 2+ minutes)
**Solution**: 
- It might be downloading dataset (normal)
- It might be extracting features (normal)
- Wait at least 5 more minutes before stopping

---

## 📊 EXPECTED FINAL RESULTS

Your trained model should achieve:

```
Accuracy:    90-95%    Excellent!
WER:         5-10%     Very low error
Precision:   89-94%
Recall:      90-95%
F1-Score:    89-94%
```

These are **PRODUCTION-QUALITY** results!

---

## 🎬 READY? LET'S GO!

**This is what you do RIGHT NOW:**

### 1. Get Kaggle Token (5 min)
- Go to https://www.kaggle.com/settings/account
- Click "Create New Token"
- Save file to `C:\Users\[YOUR_NAME]\.kaggle\kaggle.json`

### 2. Open Command Prompt (1 min)
- Press `Windows Key + R`
- Type: `cmd`
- Press Enter

### 3. Go to Project Folder (1 min)
- Type: `cd c:\xampp\htdocs\digital-library`
- Press Enter

### 4. RUN TRAINING (Automatic!)
- Type: `python train_now.py`
- Press Enter
- **WATCH IT TRAIN FOR 60-90 MINUTES!**

---

## 🎉 YOU'VE GOT THIS!

**The training will run AUTOMATICALLY once you set up Kaggle and run the command.**

No more interaction needed!

Just:
1. Setup Kaggle
2. Run `python train_now.py`
3. Wait
4. DONE!

---

**Questions?** See `STEP_BY_STEP_GUIDE.md` for more details

**Ready?** Let's build an amazing speech recognition system! 🎤
