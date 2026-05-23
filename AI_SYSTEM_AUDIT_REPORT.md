# AI System Audit Report & Implementation Plan
**Date:** 2026-05-23  
**Project:** Digital Library - Kinyarwanda & English STT/Translation/TTS System  
**Goal:** 100% Working Pretrained AI Model Implementation

---

## Executive Summary

The Digital Library project currently has:
- ✅ **Node.js/Express backend** with authentication, database, and user management
- ✅ **React frontend** with multilingual support (Kinyarwanda, English, French, Swahili)
- ✅ **Database infrastructure** with MySQL support
- ⚠️ **Legacy LSTM-based STT** (custom trained, not production-ready)
- ❌ **No pretrained model AI pipeline** (required by workbook)

**Current Gap:** The system needs a **pretrained AI service** using FastAPI with professional models, not custom LSTM training.

**Status:** AUDIT COMPLETE - Ready for implementation

---

## Current System Architecture

### Backend (Node.js)
- **File:** `api-lib/app.js` (636 lines)
- **Port:** Configured via `server.js`
- **Services:**
  - Authentication (JWT tokens, email verification)
  - Email/SMS services
  - User repository management
  - Library service (books, resources, catalog)
- **Database:** MySQL with connection pooling
- **Routes:** Auth, library, book operations

### Frontend (React)
- **Location:** `digital-library-main/digital_library/frontend/`
- **Features:** 
  - Multilingual UI (en, rw, fr, sw)
  - User authentication
  - Book browsing and management
  - Partially implemented voice components (not integrated with AI)
- **Translation files:** `public/data/translations/`

### Existing AI Attempts
- **LSTM Model:** `digital_library/stt_inference.py` (custom trained, not per workbook spec)
- **Training scripts:** Multiple training files using LSTM, not pretrained models
- **Status:** Incomplete and non-compliant with requirements

### Database
- **Connection:** MySQL via environment variables
- **State:** Can operate in demo mode (no DB) or database mode
- **Metrics:** Tracks user activity, translations, voice events

---

## Workbook Requirements Analysis

### Goal: 100% Completion Checklist
| Component | Status | Implementation Path |
|-----------|--------|-------------------|
| Kinyarwanda STT | ❌ Not using leophill/whisper-large-v3-sn-kinyarwanda | Create new AI service |
| English STT | ❌ Not using openai/whisper-large-v3 | Create new AI service |
| Kinyarwanda→English Translation | ❌ No translation service | Create using Helsinki-NLP/opus-mt-rw-en |
| English→Kinyarwanda Translation | ❌ No translation service | Create using Helsinki-NLP/opus-mt-en-rw |
| Kinyarwanda TTS | ❌ No TTS implementation | Create using facebook/mms-tts-kin |
| English TTS | ❌ No TTS implementation | Create using microsoft/speecht5_tts |
| Full Pipeline | ❌ Not integrated | Build orchestration layer |
| Testing & Evaluation | ❌ No metrics | Implement quality evaluation |

### Model Requirements Summary
```
Component           | Model ID                              | Purpose
--------------------|---------------------------------------|------------------------
Kinyarwanda STT    | leophill/whisper-large-v3-sn-kinyarwanda | Speech recognition
English STT        | openai/whisper-large-v3               | Speech recognition
RW→EN Translation  | Helsinki-NLP/opus-mt-rw-en           | Machine translation
EN→RW Translation  | Helsinki-NLP/opus-mt-en-rw           | Machine translation
Kinyarwanda TTS    | facebook/mms-tts-kin                 | Speech generation
English TTS        | microsoft/speecht5_tts                | Speech generation
```

---

## Environment Setup Status

### Current Environment
- **OS:** Windows 11 Pro (10.0.22621)
- **Python:** Available but not configured for AI service
- **Node.js:** Running (server.js active)
- **Package Manager:** npm

### Required AI Environment Setup
```
✅ Status: NOT YET CREATED
Location: pretrained_ai_models/ (new)
Structure needed:
  pretrained_ai_models/
    ├── venv/                (Python virtual env)
    ├── uploads/            (audio files)
    ├── outputs/            (results)
    ├── models/             (cached models)
    ├── app.py              (FastAPI application)
    ├── requirements.txt    (Python packages)
    └── test_samples/       (testing data)
```

---

## Integration Architecture

### Proposed System Flow

```
┌─────────────────┐
│   React UI      │
│   (Frontend)    │
└────────┬────────┘
         │ HTTP/REST
         ▼
┌─────────────────────────┐
│  Node.js Express API    │
│  (Middleware)           │
│  - Auth & routing       │
│  - Request proxying     │
└────────┬────────────────┘
         │ HTTP/POST
         ▼
┌─────────────────────────────────┐
│  FastAPI AI Service             │
│  (New Python Service)           │
│  - Endpoints: /stt, /translate  │
│  - /tts-rw, /pipeline          │
│  - Pretrained models            │
└─────────────────────────────────┘
```

### Communication Ports
- **Frontend:** http://localhost:3000 (React dev server)
- **Node.js API:** http://localhost:3001 or configured port
- **FastAPI AI:** http://localhost:8000 (separate service)

---

## Current Code State Assessment

### Strengths
1. ✅ Solid Node.js backend with auth, database, services
2. ✅ Database layer with proper abstraction
3. ✅ Frontend UI infrastructure with translation support
4. ✅ Environment variable configuration system
5. ✅ Error handling patterns established

### Weaknesses
1. ❌ No AI service at all in current production code
2. ❌ Legacy LSTM approach (non-compliant with workbook)
3. ❌ AI components scattered across multiple files
4. ❌ No clear separation between training and inference
5. ❌ Missing integration test suite for AI endpoints
6. ❌ No model caching or optimization for CPU environments

### Critical Issues
1. **Wrong approach:** LSTM training vs. pretrained models
2. **No FastAPI:** Node.js backend cannot run transformer models efficiently
3. **Missing dependencies:** PyTorch, transformers, librosa not configured
4. **No model cache:** Models would redownload each service restart
5. **No API documentation:** No test interface for AI endpoints

---

## Implementation Quality Metrics

### Success Criteria (From Workbook Section 12)

| Metric | Target | Current |
|--------|--------|---------|
| Kinyarwanda STT Word Error Rate | <15% | N/A (no implementation) |
| Translation quality (BLEU score) | >0.35 | N/A |
| TTS naturalness (human rating) | >3.5/5 | N/A |
| Model load time | <60s first load | N/A |
| Inference time (STT) | <10s per audio | N/A |
| System stability | 0 crashes in 10 runs | N/A |

---

## File Inventory

### Key Files to Modify
- `api-lib/app.js` - Add AI endpoint proxies
- `api-lib/config.js` - Add AI service configuration
- `digital-library-main/digital_library/frontend/src/App.js` - Add AI UI components

### Files to Create
- `pretrained_ai_models/app.py` - Main FastAPI application
- `pretrained_ai_models/requirements.txt` - Python dependencies
- `pretrained_ai_models/models_config.py` - Model loading configuration
- `pretrained_ai_models/tests/` - Test suite with sample audio

### Files to Archive/Remove
- `digital_library/stt_inference.py` - Move to archive (LSTM approach)
- `digital_library/*/train_*.py` - Move to archive (not needed)
- Multiple LSTM training files

---

## Risk Assessment

### High Risk Issues
1. **Model Size:** Whisper-large-v3 (~1.5GB), may need GPU acceleration
   - Mitigation: Implement model compression, batch processing
2. **First-run Latency:** Models download on first startup
   - Mitigation: Pre-download models, implement progress tracking
3. **Memory Usage:** Loading all models simultaneously may exceed 16GB
   - Mitigation: Lazy loading, model switching per request

### Medium Risk Issues
1. **Kinyarwanda Model Quality:** Specialized model with limited training data
   - Mitigation: Implement quality evaluation framework
2. **Translation Accuracy:** MarianMT models good but not perfect
   - Mitigation: Add confidence scoring, fallback handling
3. **Windows Compatibility:** Audio processing can be OS-sensitive
   - Mitigation: Use librosa/soundfile (cross-platform libraries)

---

## Compliance Checklist

From Workbook Section 13 - Completion Checklist:

```
PRE-IMPLEMENTATION
☐ Environment setup complete (venv, directories)
☐ Dependencies installed (fastapi, transformers, torch, etc.)
☐ Models cache directory prepared
☐ Upload/output directories created

IMPLEMENTATION PHASE
☐ Kinyarwanda STT loads and works
☐ English STT loads and works
☐ Kinyarwanda→English translation endpoint
☐ English→Kinyarwanda translation endpoint
☐ Kinyarwanda TTS generates WAV files
☐ English TTS selected and implemented
☐ Full pipeline endpoint working

TESTING PHASE
☐ 10 Kinyarwanda words tested
☐ 10 Kinyarwanda sentences tested
☐ 10 English sentences tested
☐ 20 translation pairs validated
☐ 10 TTS sentences generated and audible
☐ Performance metrics recorded
☐ Stability test (10 sequential runs)

DOCUMENTATION
☐ All models documented with names/purposes
☐ Testing results recorded in report
☐ API endpoints documented
☐ Performance benchmarks included
☐ System ready for integration
```

---

## Next Steps

1. **Phase 1: Environment Setup** (30 min)
   - Create pretrained_ai_models folder structure
   - Set up Python venv
   - Install dependencies
   - Configure model cache directory

2. **Phase 2: Core AI Service** (2 hours)
   - Create FastAPI app.py with model loading
   - Implement /stt endpoint for both languages
   - Implement /translate endpoint
   - Implement /tts-rw endpoint

3. **Phase 3: Testing & Validation** (1.5 hours)
   - Test each component individually
   - Create test dataset (audio samples)
   - Measure performance metrics
   - Stability testing

4. **Phase 4: Integration** (1 hour)
   - Proxy AI endpoints through Node.js API
   - Update React frontend components
   - End-to-end testing
   - Documentation

5. **Phase 5: Quality Evaluation** (30 min)
   - Record all metrics
   - Create final evaluation report
   - Prepare demonstration

---

## Estimated Timeline

| Phase | Duration | Effort | Status |
|-------|----------|--------|--------|
| Phase 1: Environment | 30 min | Low | READY |
| Phase 2: Core AI | 2 hours | High | READY |
| Phase 3: Testing | 1.5 hours | Medium | READY |
| Phase 4: Integration | 1 hour | Medium | READY |
| Phase 5: Quality | 30 min | Low | READY |
| **TOTAL** | **5 hours** | **High** | **EXECUTABLE** |

---

## Success Criteria for 100% Completion

✅ **All items from Workbook Section 13 completed**
✅ **All models loading without errors**
✅ **All endpoints responding to requests**
✅ **Quality metrics within acceptable ranges**
✅ **System stable for 10 sequential operations**
✅ **Documentation complete**
✅ **Ready for production integration**

---

## Conclusion

The Digital Library system has a solid Node.js/React foundation but **completely lacks the pretrained AI model implementation** specified in the workbook. The current LSTM-based approach is non-compliant with requirements.

**Recommendation:** Proceed with the implementation plan detailed below. The 5-hour timeline is achievable with disciplined execution across all 5 phases.

**Status:** 🟢 **AUDIT COMPLETE - READY FOR IMPLEMENTATION**

