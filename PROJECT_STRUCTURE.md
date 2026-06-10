# Digital Library Project Structure

## Organized Folder Hierarchy

```
c:\xampp\htdocs\digital-library/
│
├── 📁 FRONTEND/                          (React UI - Speech-to-Text Interface)
│   ├── public/
│   │   ├── index.html                    (Main entry point)
│   │   ├── favicon.ico
│   │   └── manifest.json
│   │
│   ├── src/
│   │   ├── api/
│   │   │   ├── client.js                 (API base configuration)
│   │   │   ├── voiceSearch.js            (STT - Speech-to-Text API calls)
│   │   │   ├── tts.js                    (TTS - Text-to-Speech API calls)
│   │   │   └── books.js                  (Library search API)
│   │   │
│   │   ├── components/
│   │   │   ├── VoiceSearch/              (STT recording component)
│   │   │   │   ├── VoiceSearch.jsx
│   │   │   │   ├── RecordButton.jsx
│   │   │   │   └── TranscriptDisplay.jsx
│   │   │   │
│   │   │   ├── AudioPlayer/              (TTS playback component)
│   │   │   │   ├── AudioPlayer.js
│   │   │   │   └── AudioControls.jsx
│   │   │   │
│   │   │   ├── SearchResults/
│   │   │   │   ├── BookCard.js
│   │   │   │   └── ResultsList.jsx
│   │   │   │
│   │   │   └── Layout/
│   │   │       ├── Header.jsx
│   │   │       ├── Sidebar.jsx
│   │   │       └── Footer.jsx
│   │   │
│   │   ├── pages/
│   │   │   ├── HomePage.jsx              (Main interface)
│   │   │   ├── SearchPage.jsx            (Voice search results)
│   │   │   ├── BooksPage.jsx             (Book browser)
│   │   │   └── AudioLabPage.jsx          (STT/TTS testing)
│   │   │
│   │   ├── styles/
│   │   │   ├── App.css
│   │   │   ├── VoiceSearch.css
│   │   │   ├── AudioPlayer.css
│   │   │   └── variables.css             (Theme/colors)
│   │   │
│   │   ├── App.jsx                       (Main app component)
│   │   └── index.jsx                     (React render entry)
│   │
│   ├── package.json                      (Node dependencies)
│   ├── vite.config.js                    (Build config)
│   └── .env                              (Frontend env vars)
│
│
├── 📁 BACKEND/                           (PHP API Server)
│   ├── config/
│   │   ├── database.php                  (MySQL connection)
│   │   ├── constants.php                 (App constants)
│   │   └── settings.php                  (Config variables)
│   │
│   ├── routes/
│   │   ├── api.php                       (Main API router)
│   │   └── auth.php                      (Authentication routes)
│   │
│   ├── services/                         (Business logic)
│   │   ├── UserService.php
│   │   ├── BookService.php               (Book search/retrieval)
│   │   ├── SearchService.php
│   │   ├── STTService.php                (Speech-to-Text service)
│   │   ├── TTSService.php                (Text-to-Speech service)
│   │   ├── AudioService.php              (Audio processing)
│   │   ├── SchemaService.php
│   │   └── DatabaseService.php
│   │
│   ├── helpers/
│   │   ├── response.php                  (Standard response format)
│   │   ├── logger.php                    (Logging utility)
│   │   ├── auth.php                      (Auth helper)
│   │   └── error.php                     (Error handling)
│   │
│   ├── middleware/
│   │   ├── auth.php                      (Authentication middleware)
│   │   ├── cors.php                      (CORS handling)
│   │   └── ratelimit.php                 (Rate limiting)
│   │
│   ├── python/                           (Python ML service integration)
│   │   └── ml_service.py                 (Python helper scripts)
│   │
│   ├── uploads/
│   │   ├── audio/                        (Uploaded audio files)
│   │   ├── tts/                          (TTS output MP3s)
│   │   └── profiles/                     (User profile images)
│   │
│   ├── index.php                         (Entry point)
│   ├── .htaccess                         (Apache routing)
│   └── .env                              (Backend env vars)
│
│
├── 📁 DATABASE/                          (MySQL Schema & Migrations)
│   ├── schema/
│   │   ├── tables/
│   │   │   ├── users.sql                 (User accounts)
│   │   │   ├── books.sql                 (Book catalog)
│   │   │   ├── authors.sql               (Author info)
│   │   │   ├── categories.sql            (Book categories)
│   │   │   ├── departments.sql           (Faculty departments)
│   │   │   ├── faculties.sql             (University faculties)
│   │   │   ├── courses.sql               (Course listings)
│   │   │   ├── voice_search_logs.sql     (STT logs)
│   │   │   ├── tts_logs.sql              (TTS logs)
│   │   │   ├── borrowing_records.sql     (Book loans)
│   │   │   ├── reviews.sql               (Book reviews)
│   │   │   └── activity_logs.sql         (User activity)
│   │   │
│   │   └── relationships/
│   │       ├── foreign_keys.sql          (Relationships)
│   │       └── indexes.sql               (Performance indexes)
│   │
│   ├── queries/
│   │   ├── book_search.sql               (Search book by STT text)
│   │   ├── department_books.sql          (Books by department)
│   │   ├── faculty_courses.sql           (Course listings)
│   │   └── voice_analytics.sql           (STT usage stats)
│   │
│   ├── migrations/
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_voice_features.sql        (STT/TTS tables)
│   │   └── 003_add_departments.sql
│   │
│   └── database.sql                      (Full schema dump)
│
│
├── 📁 ML/                                (Machine Learning Models)
│   ├── common/
│   │   ├── metrics_cpu.py                (Evaluation metrics)
│   │   ├── metrics_logger.py             (Training logs)
│   │   └── audio_processor.py            (Audio utilities)
│   │
│   ├── speech/
│   │   ├── wav2vec2_utils.py             (Wav2Vec2 helpers)
│   │   ├── preprocessing.py              (Audio preprocessing)
│   │   └── feature_extraction.py         (MFCC features)
│   │
│   └── __pycache__/
│
│
├── 📁 ML-SPEECH/                         (Trained Model Checkpoints)
│   └── models/
│       ├── transformer_librispeech_model/    (Phase 1 - Base training)
│       │   ├── pytorch_model.bin
│       │   ├── config.json
│       │   ├── processor_config.json
│       │   └── tokenizer_config.json
│       │
│       ├── transformer_model/                (Phase 2 - FINAL PRODUCTION)
│       │   ├── pytorch_model.bin             ⭐ MAIN INFERENCE MODEL
│       │   ├── config.json
│       │   ├── processor_config.json
│       │   └── tokenizer_config.json
│       │
│       ├── wav2vec2_lstm_adapter_best.pt     (Fallback model)
│       ├── wav2vec2_lstm_adapter_last.pt
│       ├── english_lstm_ctc_best.pt
│       └── english_lstm_ctc_last.pt
│
│
├── 📁 MODELS/                            (Model Metrics & Reports)
│   └── stt/
│       ├── transformer_metrics.json      (STT accuracy metrics)
│       ├── wav2vec2_lstm_adapter_metrics.json
│       └── english_lstm_real_eval.json
│
│
├── 📁 SCRIPTS/                           (Training & Service Scripts)
│   ├── TRAINING SCRIPTS
│   │   ├── transformer_train_complete.py    ⭐ MAIN TRAINING SCRIPT
│   │   │   ├── Phase 1: 15 epochs (LibriSpeech synthetic)
│   │   │   ├── Phase 2: 20 epochs (Personal voice)
│   │   │   ├── Auto-extend: 100 epochs if needed
│   │   │   ├── Output: ./transformer_model/
│   │   │   └── Vocabulary: 50+ library-related terms
│   │   │
│   │   ├── train_lstm_librispeech_personal.py
│   │   ├── train_english_lstm_ctc_real.py
│   │   └── train_wav2vec2_lstm_adapter.py
│   │
│   ├── INFERENCE SERVICES
│   │   ├── transformer_speech_service.py    ⭐ STT SERVICE (Port 5004)
│   │   │   ├── Flask API server
│   │   │   ├── Endpoint: /api/stt/transcribe
│   │   │   └── Uses: ./transformer_model/
│   │   │
│   │   ├── wav2vec2_lstm_adapter_service.py (Port 5003 - FALLBACK)
│   │   └── english_lstm_ctc_service.py
│   │
│   ├── TTS SCRIPTS
│   │   ├── gtts_synthesize.py            ⭐ TEXT-TO-SPEECH (Google gTTS)
│   │   │   ├── Uses: Google Text-to-Speech API
│   │   │   ├── Input: Text
│   │   │   └── Output: MP3 audio file
│   │   │
│   │   └── tts_wrapper.py
│   │
│   ├── EVALUATION SCRIPTS
│   │   ├── evaluate_english_lstm_stt_real.py
│   │   ├── validate_lstm_manifests.py
│   │   └── test_models.py
│   │
│   └── UTILITY SCRIPTS
│       ├── audio_processor.py
│       ├── dataset_downloader.py
│       └── model_converter.py
│
│
├── 📁 SPEECH_DATASETS/                   (Audio Training Data)
│   ├── LibriSpeech/
│   │   ├── train-clean-100/              (Phase 1 source)
│   │   ├── dev-clean/                    (Validation set)
│   │   └── test-clean/                   (Test set)
│   │
│   ├── manifests/
│   │   ├── train.jsonl                   (Training manifest)
│   │   ├── dev.jsonl                     (Dev manifest)
│   │   └── test.jsonl                    (Test manifest)
│   │
│   └── processed/
│       ├── wav2vec2-base-960h/           (Cached features)
│       └── features/                     (MFCC features)
│
│
├── 📁 VOICE_DATA/                        (Personal Voice Recordings)
│   ├── train/
│   │   ├── sample1.wav                   (User voice recording)
│   │   ├── sample1.txt                   (Transcription)
│   │   └── ... (add your recordings here)
│   │
│   └── val/
│       ├── test1.wav                     (Validation recording)
│       ├── test1.txt
│       └── ...
│
│
├── 📁 TRAINING_LOGS/                     (Training History)
│   ├── transformer_training_full.log     (Training progress)
│   ├── transformer_training_session.json (Session metadata)
│   ├── lstm_ctc_session.json
│   └── wav2vec2_lstm_adapter_session.json
│
│
├── 📁 LOGS/                              (Application Logs)
│   ├── transformer-speech-service.err.log
│   ├── transformer-speech-service.out.log
│   ├── wav2vec2-lstm-service.err.log
│   └── api-errors.log
│
│
├── 📁 DOCS/                              (Documentation)
│   ├── API_DOCUMENTATION.md              (API endpoints)
│   ├── TRANSFORMER_STT_INTEGRATION.md    (STT setup)
│   ├── DATABASE_SCHEMA.md                (DB structure)
│   ├── TRAINING_GUIDE.md                 (Model training)
│   ├── VOICE_RECORDING_GUIDE.md          (How to record)
│   └── TROUBLESHOOTING.md                (Common issues)
│
│
├── 📁 CONFIG/                            (Configuration Files)
│   ├── .env                              (Environment variables)
│   ├── .env.example                      (Template)
│   └── app.config.json                   (App settings)
│
│
├── 📁 VENDOR/                            (PHP Dependencies)
│   └── composer packages
│
│
├── 📁 NODE_MODULES/                      (NPM Dependencies)
│   └── JavaScript packages
│
│
└── 📄 ROOT FILES
    ├── package.json                      (Node dependencies)
    ├── composer.json                     (PHP dependencies)
    ├── vite.config.js                    (Frontend build config)
    ├── .htaccess                         (Apache routing)
    ├── PROJECT_STRUCTURE.md              (This file)
    ├── TRANSFORMER_STT_INTEGRATION.md    (Integration guide)
    └── README.md                         (Project overview)
```

---

## STT & gTTS Connection Flow

### 1. SPEECH-TO-TEXT (STT) Flow
```
USER FRONTEND (React)
    ↓ Records audio
    ↓ Sends WAV to /voice-search/search
    ↓
PHP BACKEND (backend/routes/api.php)
    ↓ Receives audio file
    ↓ Calls local_open_vocabulary_transcribe()
    ↓ Routes to STT service with fallback chain
    ↓
STT SERVICE LAYER (Fallback order):
    1. Transformer Model (Port 5004) ⭐ PRIMARY
       └─ scripts/transformer_speech_service.py
       └─ Uses: ./ml-speech/models/transformer_model/
       └─ Returns: text transcription
    
    2. Wav2Vec2 + LSTM (Port 5003) - FALLBACK
       └─ scripts/wav2vec2_lstm_adapter_service.py
       └─ Uses: ./ml-speech/models/wav2vec2_lstm_adapter_best.pt
       └─ Returns: text transcription
    
    3. Whisper (Port 5001) - FINAL FALLBACK
       └─ OpenAI Whisper tiny.en
       └─ Returns: text transcription
    ↓
PHP BACKEND PROCESSES TEXT
    ↓ Parses transcription
    ↓ Searches database for books
    ↓ Logs to voice_search_logs table
    ↓
RESULTS RETURNED TO FRONTEND
    ↓ Displays search results
    ↓ Shows matching books/departments/faculties
```

### 2. TEXT-TO-SPEECH (gTTS) Flow
```
USER FRONTEND (React)
    ↓ Requests TTS for search result
    ↓ Sends text to /tts endpoint
    ↓
PHP BACKEND (backend/routes/api.php → TTSService)
    ↓ Receives text
    ↓ Calls scripts/gtts_synthesize.py
    ↓
gTTS SERVICE (Python)
    ↓ Input: Text string
    ↓ Uses: Google Text-to-Speech API
    ├─ Language: English ('en')
    ├─ Slow speech: false
    └─ File format: MP3
    ↓ Generates audio file
    ↓ Saves to: backend/uploads/tts/<hash>.mp3
    ↓
PHP BACKEND RETURNS
    ↓ Returns MP3 URL
    ↓ Logs to tts_logs table
    ↓
FRONTEND PLAYS AUDIO
    ↓ Uses: components/AudioPlayer/AudioPlayer.js
    ↓ HTML5 <audio> element plays MP3
```

---

## How to Find & Access Models

### Finding STT Model
```
Location: ./ml-speech/models/transformer_model/
Files:
  - pytorch_model.bin       (Model weights - 350MB)
  - config.json            (Model architecture)
  - processor_config.json  (Audio processor config)
  - tokenizer_config.json  (Character tokenizer)

Access in Code:
  - PHP: See backend/routes/api.php line ~115
  - Python: scripts/transformer_speech_service.py line ~30
  - Service: Runs on http://127.0.0.1:5004/api/stt/transcribe
```

### Finding gTTS Configuration
```
Location: scripts/gtts_synthesize.py
Called by: backend/services/TTSService.php
Output: backend/uploads/tts/<hash>.mp3

Configuration:
  - Language: 'en' (English)
  - Speed: normal
  - Format: MP3
  - Provider: Google Translate Text-to-Speech

Access:
  - Generate: POST /tts with text
  - Play: Audio files served from backend/uploads/tts/
```

### Finding Training Models
```
Phase 1 (Base): ./transformer_librispeech_model/
Phase 2 (Final): ./transformer_model/
Training Script: ./scripts/transformer_train_complete.py
Training Data: ./speech_datasets/LibriSpeech/
Custom Data: ./voice_data/train/
```

---

## DATABASE STRUCTURE FOR STT/TTS

### Voice Search Logs Table
```sql
CREATE TABLE voice_search_logs (
  id INT AUTO_INCREMENT,
  user_id INT,
  transcript TEXT,          -- STT result
  results_count INT,
  status VARCHAR(50),
  model_used VARCHAR(100),  -- 'transformer', 'wav2vec2', or 'whisper'
  confidence FLOAT,
  created_at TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### TTS Logs Table
```sql
CREATE TABLE tts_logs (
  id INT AUTO_INCREMENT,
  user_id INT,
  original_text TEXT,
  audio_file_path VARCHAR(255),
  duration_seconds FLOAT,
  status VARCHAR(50),
  created_at TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

---

## Summary

| Component | Location | Purpose |
|-----------|----------|---------|
| **STT Model** | `./ml-speech/models/transformer_model/` | Speech recognition |
| **STT Service** | `./scripts/transformer_speech_service.py` | Port 5004 inference |
| **gTTS Synthesis** | `./scripts/gtts_synthesize.py` | Audio generation |
| **Frontend STT** | `./frontend/src/api/voiceSearch.js` | UI integration |
| **Backend STT** | `./backend/routes/api.php` | API routing |
| **Backend TTS** | `./backend/services/TTSService.php` | TTS processing |
| **Training** | `./scripts/transformer_train_complete.py` | Model training |
| **Logs** | `./training_logs/` | Training history |

---

**Next: Update training script with digital library vocabulary**
