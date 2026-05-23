# Quick Start Guide - 100% AI Implementation
**Status:** Ready for execution  
**Estimated Time:** 5 hours total  
**Target:** Complete Workbook Section 13 Checklist

---

## What's the Gap?

Your system has:
- ✅ Node.js backend with authentication
- ✅ React frontend with translations
- ✅ Database infrastructure
- ❌ **Missing: Pretrained AI models service** (this is 100% of what we're building)

Current state: **0% AI implementation per workbook**  
Target state: **100% AI implementation per workbook**

---

## The Solution in 3 Steps

### Step 1: Create AI Service (Python + FastAPI)
- Separate service from Node.js backend
- Listens on http://localhost:8000
- Runs pretrained models (not training)
- Handles: speech recognition, translation, speech synthesis

### Step 2: Connect to Backend (Node.js Proxy)
- Add proxy routes in Express
- Route audio/text requests to Python service
- Return results to frontend

### Step 3: Test & Verify (Quality Evaluation)
- Test each component individually
- Measure performance metrics
- Document results
- Mark complete per workbook checklist

---

## Execution Roadmap

```
TIME    ACTIVITY                          DURATION
────────────────────────────────────────────────────
00:00   Phase 1: Environment Setup          30 min
        └─ Create folders, venv, install
        
00:30   Phase 2: Core AI Service           2 hours
        └─ Create FastAPI app with models
        
02:30   Phase 3: Component Testing         1.5 hours
        └─ Test STT, Translation, TTS
        
04:00   Phase 4: Node.js Integration        1 hour
        └─ Add proxy routes, connect
        
05:00   Phase 5: Quality Evaluation         30 min
        └─ Record metrics, documentation
        
05:30   ✅ COMPLETE - 100% WORKING
```

---

## Phase 1: Environment (30 min)

### Commands to Run
```bash
cd c:\xampp\htdocs\digital-library
mkdir pretrained_ai_models
cd pretrained_ai_models
mkdir uploads outputs models test_samples

# Create virtual environment
python -m venv venv
venv\Scripts\activate

# Install packages (copy from IMPLEMENTATION_PLAN.md)
pip install fastapi uvicorn python-multipart torch transformers sentencepiece accelerate soundfile librosa scipy
```

### Success Check
```bash
python -c "import torch; import transformers; print('OK')"
```

---

## Phase 2: Core AI Service (2 hours)

### Create app.py
File: `pretrained_ai_models/app.py`

Copy the full skeleton from workbook Section 9, but update with:
- Add English TTS endpoint
- Add health check endpoint
- Proper error handling
- Model caching

### Key Endpoints
```
POST /stt
  - Upload audio file
  - Select language (rw or en)
  - Returns: recognized text

POST /translate
  - Provide text
  - Direction: rw-en or en-rw
  - Returns: translated text

POST /tts-rw
  - Provide text
  - Returns: audio file path

POST /tts-en (bonus)
  - Provide text
  - Returns: audio file path

POST /pipeline
  - Upload audio
  - Specify source & target languages
  - Returns: recognized + translated text

GET /health
  - Returns: service status
```

### Start Service
```bash
uvicorn app:app --host 127.0.0.1 --port 8000 --reload
```

### Test in Browser
Go to: `http://127.0.0.1:8000/docs`
- Upload test audio
- Try each endpoint
- Check responses

---

## Phase 3: Component Testing (1.5 hours)

### What to Test

**Test 1: Kinyarwanda STT**
```
Upload: Any Kinyarwanda audio
Language: rw
Expected: Kinyarwanda text (readable, not gibberish)
Success: ✅ Text appears to be valid Kinyarwanda
```

**Test 2: English STT**
```
Upload: Any English audio
Language: en
Expected: English text (readable, not gibberish)
Success: ✅ Text appears to be valid English
```

**Test 3: Translation RW→EN**
```
Text: "Ndashaka gusoma igitabo"
Direction: rw-en
Expected: Something like "I want to read a book"
Success: ✅ Meaning preserved
```

**Test 4: Translation EN→RW**
```
Text: "Hello world"
Direction: en-rw
Expected: Kinyarwanda equivalent
Success: ✅ Text is in Kinyarwanda
```

**Test 5: Kinyarwanda TTS**
```
Text: "Murakaza neza"
Expected: WAV file in outputs/
Success: ✅ File is playable, sounds like speech
```

**Test 6: English TTS** (optional, use fallback if needed)
```
Text: "Hello world"
Expected: WAV file in outputs/
Success: ✅ File is playable
```

### Record Results
Save to: `test_results.json`
```json
{
  "kinyarwanda_stt": "✅ PASS",
  "english_stt": "✅ PASS",
  "translation_rw_en": "✅ PASS",
  "translation_en_rw": "✅ PASS",
  "tts_kinyarwanda": "✅ PASS",
  "tts_english": "✅ PASS"
}
```

---

## Phase 4: Integration (1 hour)

### Update Node.js Config
File: `api-lib/config.js`

Add:
```javascript
ai_service: {
  enabled: process.env.AI_SERVICE_ENABLED === 'true',
  baseUrl: 'http://127.0.0.1:8000',
  timeout: 60000,
}
```

### Create AI Service Proxy
File: `api-lib/services/aiService.js`

Simple proxy that forwards requests to FastAPI service.

### Add Routes
File: `api-lib/app.js`

Add routes:
```
POST /api/audio/stt
POST /api/translate
POST /api/audio/tts
```

### Test Routes
```bash
# In Terminal
curl -X POST http://localhost:3001/api/translate \
  -H "Content-Type: application/json" \
  -d '{"text":"Hello","direction":"en-rw"}'
```

---

## Phase 5: Quality Evaluation (30 min)

### Check All Items
From Workbook Section 13:

```
✅ Kinyarwanda STT works with real recorded audio
✅ English STT works with real recorded audio
✅ Kinyarwanda to English translation works
✅ English to Kinyarwanda translation works
✅ Kinyarwanda TTS generates playable WAV files
✅ English TTS is selected and tested
✅ Full pipeline returns recognized text and translated text
✅ All models are documented with names and purposes
✅ Testing results are recorded
✅ The AI module is ready to connect to the existing system
```

### Create Final Report
File: `AI_FINAL_REPORT.md`

Include:
- All test results
- Performance metrics
- Quality assessment
- Completion checklist
- System readiness statement

### Document System
Create file: `AI_SYSTEM_GUIDE.md`

Include:
- How to start services
- Available endpoints
- Example requests
- Troubleshooting

---

## Validation Gates

Each phase ends with a validation gate. If gate fails, don't proceed.

### Gate 1 (After Phase 1)
```bash
# Should succeed
python -c "import torch; import transformers"
# Should fail gracefully
python -c "uvicorn app:app"  # app.py doesn't exist yet
```

### Gate 2 (After Phase 2)
```bash
# Should work
uvicorn app:app --host 127.0.0.1 --port 8000

# Should respond
curl http://127.0.0.1:8000/health
# Expected: {"status": "ready"}
```

### Gate 3 (After Phase 3)
```json
{
  "kinyarwanda_stt": "✅ PASS",
  "english_stt": "✅ PASS",
  "translation_rw_en": "✅ PASS",
  "translation_en_rw": "✅ PASS",
  "tts_kinyarwanda": "✅ PASS",
  "pipeline": "✅ PASS"
}
```

### Gate 4 (After Phase 4)
```bash
# All should return 200 and valid JSON
curl -X GET http://localhost:3001/api/health
curl -X POST http://localhost:3001/api/translate \
  -d "text=test&direction=en-rw"
```

### Gate 5 (After Phase 5)
- [ ] All 10 items in Section 13 checklist completed
- [ ] All tests passed
- [ ] Documentation complete
- [ ] Demo works
- [ ] Ready for production

---

## Troubleshooting Quick Reference

### Issue: "ModuleNotFoundError: No module named 'torch'"
**Solution:** Check venv is active: `venv\Scripts\activate`

### Issue: "Address already in use :8000"
**Solution:** Kill previous process: `netstat -ano | findstr :8000`

### Issue: Model download too slow
**Solution:** Expected (first run only). Models cache locally after.

### Issue: Out of memory
**Solution:** Use CPU mode, reduce batch size, or upgrade RAM

### Issue: Audio file format error
**Solution:** Convert to WAV: Use Audacity or online converter

### Issue: Translation looks wrong
**Solution:** MarianMT isn't perfect. Check if meaning is preserved (not word-for-word)

### Issue: TTS audio sounds robotic
**Solution:** Normal for synthesized speech. Quality is acceptable.

---

## Key Endpoints Summary

| Endpoint | Method | Input | Output |
|----------|--------|-------|--------|
| /stt | POST | audio file + language | text |
| /translate | POST | text + direction | text |
| /tts-rw | POST | text | audio file path |
| /pipeline | POST | audio + languages | recognized + translated text |
| /health | GET | none | status |

---

## Files You'll Create

1. `pretrained_ai_models/app.py` (main AI service)
2. `pretrained_ai_models/config.py` (configuration)
3. `pretrained_ai_models/requirements.txt` (dependencies)
4. `api-lib/services/aiService.js` (proxy service)
5. Add routes to `api-lib/app.js`
6. `test_results.json` (test outcomes)
7. `AI_FINAL_REPORT.md` (documentation)
8. `AI_SYSTEM_GUIDE.md` (user guide)

---

## Success Definition

When complete, you will have:

✅ **Pretrained AI models** (not training from scratch)  
✅ **Full STT pipeline** (Kinyarwanda + English)  
✅ **Full Translation pipeline** (bidirectional)  
✅ **Full TTS pipeline** (speech generation)  
✅ **Integration layer** (Node.js proxy)  
✅ **Quality metrics** (all documented)  
✅ **Complete documentation** (how to use)  
✅ **100% Workbook compliance** (all items checked)  
✅ **Production ready** (tested and stable)  

---

## Next Actions

1. **Read:** `IMPLEMENTATION_PLAN.md` (detailed steps)
2. **Scan:** `AI_SYSTEM_AUDIT_REPORT.md` (current state analysis)
3. **Start:** Phase 1 (environment setup)
4. **Track:** Each validation gate
5. **Finish:** Phase 5 (quality evaluation)
6. **Celebrate:** 🎉 100% COMPLETE

---

## Support Files

All detailed instructions in:
- `IMPLEMENTATION_PLAN.md` - Detailed step-by-step
- `AI_SYSTEM_AUDIT_REPORT.md` - Current state analysis
- Workbook PDF - Original specifications
- `app.py` skeleton code (in workbook Section 9)

---

**Current Status:** 🟢 Ready to Start  
**Estimated Completion:** 5 hours  
**Difficulty:** Medium (mostly copy-paste from workbook with small modifications)  
**Result:** 100% Functional AI System

Good luck! 🚀

