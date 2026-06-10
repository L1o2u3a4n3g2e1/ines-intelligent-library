# Complete System Architecture & Data Flow

## Table of Contents
1. [Special Directories (.claude, .codex)](#special-directories)
2. [Complete Data Flow](#complete-data-flow)
3. [Database Connection](#database-connection)
4. [Frontend-Backend Connection](#frontend-backend-connection)
5. [Model Training Pipeline](#model-training-pipeline)
6. [Dataset Management](#dataset-management)
7. [How to Run Everything](#how-to-run-everything)

---

## Special Directories

### `.claude/` Directory
**Purpose**: Claude Code IDE configuration and state management

**Contents**:
- `scheduled_tasks.lock` - Lock file for scheduled background tasks
- Project context caching
- IDE session state
- Memory/conversation history

**Used by**: Claude Code IDE extension (VS Code)

**Why it exists**: Allows Claude Code to:
- Track long-running background processes
- Cache conversation context
- Save project-specific settings
- Manage autonomous task execution

---

### `.codex/` Directory
**Purpose**: Vite dev server logs and build output tracking

**Contents**:
```
.codex/
├── vite-test.stderr.log      (Vite test errors)
├── vite-test.stdout.log      (Vite test output)
├── vite.stderr.log           (Dev server errors)
└── vite.stdout.log           (Dev server output)
```

**Used by**: Frontend development server (Vite React)

**What it tracks**:
- Dev server startup/shutdown
- Hot module reload (HMR) events
- Build errors and warnings
- Component compilation logs
- WebSocket connections

**Example log entry**:
```
[2026-06-08 10:33:00] VITE v4.3.0 ready in 234 ms
[2026-06-08 10:33:01] ➜  Local:   http://localhost:5173/
[2026-06-08 10:33:05] ✓ src/App.jsx updated
```

---

## Complete Data Flow

### Architecture Diagram
```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                          │
│  React Frontend (http://localhost:3000 or :5173 dev server)     │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Voice Recording Component                                │   │
│  │ - Records user voice via Web Audio API                  │   │
│  │ - Formats as WAV/WebM                                   │   │
│  └──────────────────────┬──────────────────────────────────┘   │
└─────────────────────────┼─────────────────────────────────────┘
                          │
                          │ POST audio blob
                          │ /voice-search/search
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                      BACKEND API SERVER                         │
│      PHP (http://localhost/digital-library/backend/)            │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ API Router (backend/routes/api.php)                     │   │
│  │ - Receives audio file                                   │   │
│  │ - Validates file format                                 │   │
│  │ - Routes to STT service                                 │   │
│  └──────────────────────┬──────────────────────────────────┘   │
│                         │                                       │
│                         │ calls local_open_vocabulary_transcribe()
│                         ▼                                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ STT Fallback Chain                                      │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ 1. Try Transformer Model (Port 5004) ⭐                 │   │
│  │    POST http://127.0.0.1:5004/api/stt/transcribe        │   │
│  │    Uses: ./ml-speech/models/transformer_model/           │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ 2. Try Wav2Vec2 + LSTM Adapter (Port 5003)             │   │
│  │    POST http://127.0.0.1:5003/api/stt/transcribe        │   │
│  │    Uses: ./ml-speech/models/wav2vec2_lstm_adapter.pt    │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ 3. Try Whisper (Port 5001)                             │   │
│  │    POST http://127.0.0.1:5001/transcribe               │   │
│  │    Uses: OpenAI Whisper tiny.en                         │   │
│  └──────────────────────┬──────────────────────────────────┘   │
│                         │                                       │
│                         │ Receives text transcription
│                         ▼                                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Search Service (backend/services/SearchService.php)    │   │
│  │ - Parses transcription text                             │   │
│  │ - Queries database for matching books                   │   │
│  │ - Filters by department/faculty                         │   │
│  └──────────────────────┬──────────────────────────────────┘   │
│                         │                                       │
│                         │ SELECT * FROM books WHERE...
│                         ▼                                       │
└─────────────────────────┼─────────────────────────────────────┘
                          │
                          │ Database Query
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    MYSQL DATABASE                               │
│      (ines_intelligent_library)                                 │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Tables:                                                 │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ • books               - Book catalog                    │   │
│  │ • authors             - Author info                     │   │
│  │ • categories          - Book categories                 │   │
│  │ • departments         - Academic departments           │   │
│  │ • faculties           - University faculties            │   │
│  │ • voice_search_logs   - STT search history             │   │
│  │ • tts_logs            - TTS generation history         │   │
│  │ • borrowing_records   - Book loans                     │   │
│  │ • users               - User accounts                   │   │
│  └──────────────────────┬──────────────────────────────────┘   │
│                         │                                       │
│                         │ INSERT INTO voice_search_logs
│                         │ (logs transcript, model used, results)
│                         ▼                                       │
└─────────────────────────┼─────────────────────────────────────┘
                          │
                          │ JSON response with:
                          │ - Transcript text
                          │ - Books found
                          │ - Departments/Faculties
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND DISPLAY                             │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Search Results Component                                │   │
│  │ - Shows transcription: "FIND COMPUTER SCIENCE BOOKS"    │   │
│  │ - Lists matching books:                                 │   │
│  │   • "Introduction to Algorithms"                        │   │
│  │   • "Design Patterns"                                   │   │
│  │   • "Computer Architecture"                             │   │
│  └──────────────────────┬──────────────────────────────────┘   │
│                         │                                       │
│                         │ Optional: User clicks "Play Audio"
│                         ▼                                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ TTS Component                                            │   │
│  │ - Sends book title to /tts endpoint                     │   │
│  │ - Receives MP3 URL                                      │   │
│  │ - Plays audio with <audio> element                      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Database Connection

### How Backend Connects to Database

**File**: `backend/config/database.php`

```php
<?php
class Database {
    private static $connection;
    
    public static function connection(): PDO {
        if (!self::$connection) {
            // MySQL connection string
            $dsn = "mysql:host=" . getenv('DB_HOST') . 
                   ";dbname=" . getenv('DB_NAME') . 
                   ";charset=utf8mb4";
            
            self::$connection = new PDO(
                $dsn,
                getenv('DB_USER'),      // 'root' or username
                getenv('DB_PASSWORD'),  // password
                [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
                ]
            );
        }
        return self::$connection;
    }
}
?>
```

### Connection Details

**Environment Variables** (`.env`):
```
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=ines_intelligent_library
```

**Connection Flow**:
1. Frontend POSTs audio to PHP backend
2. Backend receives audio file
3. Routes to STT (speech-to-text)
4. Gets text transcription
5. **Connects to MySQL database**
6. Executes query:
   ```sql
   SELECT * FROM books 
   WHERE title LIKE '%<transcription>%'
   OR author LIKE '%<transcription>%'
   OR department_id IN (SELECT id FROM departments WHERE name LIKE '%<transcription>%')
   ```
7. **Logs search to voice_search_logs table**
8. Returns results as JSON

**Key Tables**:
- `voice_search_logs` - Stores every STT search
- `tts_logs` - Stores every TTS generation
- `books` - Book catalog
- `departments` - Department information
- `faculties` - Faculty information

---

## Frontend-Backend Connection

### How Frontend Communicates with Backend

**Frontend Config** (`frontend/src/api/client.js`):
```javascript
const API_BASE_URL = 'http://localhost/digital-library/backend';

export const apiClient = {
  post: async (endpoint, data) => {
    return fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  }
};
```

### Voice Search Flow

**Step 1: Frontend Records** (`frontend/src/components/VoiceSearch/VoiceSearch.jsx`)
```javascript
async function handleVoiceSearch(audioBlob) {
  const formData = new FormData();
  formData.append('audio', audioBlob);
  
  // POST to backend
  const response = await fetch(
    'http://localhost/digital-library/backend/voice-search/search',
    { method: 'POST', body: formData }
  );
  
  const result = await response.json();
  
  // result.transcript = "FIND COMPUTER SCIENCE BOOKS"
  // result.results = [{ id: 1, title: "...", author: "..." }, ...]
  // result.stt = { model: "transformer", confidence: 0.95 }
}
```

**Step 2: Backend Processes** (`backend/routes/api.php`)
```php
if ($method === 'POST' && $path === '/voice-search/search') {
  // 1. Receive audio
  $file = $_FILES['audio'];
  
  // 2. Call STT service
  $stt = local_open_vocabulary_transcribe($file);
  $transcript = $stt['transcription'] ?? '';
  
  // 3. Query database
  $stmt = pdo()->prepare("
    SELECT * FROM books 
    WHERE title LIKE :search 
    OR author LIKE :search
    LIMIT 20
  ");
  $stmt->execute([':search' => "%{$transcript}%"]);
  
  // 4. Log to database
  pdo()->prepare("
    INSERT INTO voice_search_logs 
    (user_id, transcript, results_count, status, model_used) 
    VALUES (:uid, :trans, :count, :status, :model)
  ")->execute([
    ':uid' => $user['id'],
    ':trans' => $transcript,
    ':count' => $stmt->rowCount(),
    ':status' => 'success',
    ':model' => 'transformer'
  ]);
  
  // 5. Return JSON response
  return Response::ok([
    'transcript' => $transcript,
    'results' => $stmt->fetchAll(),
    'stt' => $stt
  ]);
}
```

**Step 3: Frontend Displays Results**
```javascript
// Show transcription
<p>{result.transcript}</p>

// Show book results
{result.results.map(book => (
  <BookCard 
    key={book.id} 
    book={book}
    onPlay={() => playAudio(book.title)}
  />
))}
```

---

## Model Training Pipeline

### How Transformer Model Training Connects to System

**Training Script**: `scripts/transformer_train_complete.py`

```
TRAINING FLOW:
├─ Phase 1: LibriSpeech Training (15 epochs)
│  ├─ Input: 5000 synthetic speech samples
│  ├─ Vocabulary: 100+ library terms
│  ├─ Model: facebook/wav2vec2-base-960h
│  ├─ Output: ./transformer_librispeech_model/
│  └─ Metrics: WER, accuracy logged to training_logs/
│
├─ Phase 2: Personal Voice Fine-tuning (20 epochs)
│  ├─ Input: voice_data/train/*.wav + *.txt
│  ├─ Base Model: Phase 1 output
│  ├─ Learning Rate: 1e-5 (transfer learning)
│  ├─ Output: ./transformer_model/ ⭐ PRODUCTION
│  └─ Metrics: Saved to models/stt/transformer_metrics.json
│
└─ Auto-Extend (if user absent):
   ├─ Epochs: Extend to ~100 total
   ├─ Datasets: Add more samples
   ├─ Target: 95%+ accuracy
   └─ Output: Updated ./transformer_model/
```

### Model Integration

**After training completes**:

1. **Inference Service Loads Model**
   ```python
   # scripts/transformer_speech_service.py
   model = Wav2Vec2ForCTC.from_pretrained('./transformer_model')
   processor = Wav2Vec2Processor.from_pretrained('./transformer_model')
   ```

2. **Service Listens on Port 5004**
   ```python
   @app.route('/api/stt/transcribe', methods=['POST'])
   def transcribe():
     # Uses loaded model to transcribe audio
     # Returns JSON with transcription + confidence
   ```

3. **Backend Routes Audio to Service**
   ```php
   service_upload_audio('http://127.0.0.1:5004/api/stt/transcribe', $file, 120)
   ```

4. **Frontend Gets Results**
   ```javascript
   // Transcript from Transformer model is displayed
   ```

---

## Dataset Management

### All Datasets Being Used

#### 1. **LibriSpeech Dataset** (Phase 1 Training)
**Source**: OpenSlr (open source speech recognition database)
**URL**: https://www.openslr.org/12/
**Location**: `speech_datasets/LibriSpeech/`
**Size**: 100+ hours of English audiobook recordings
**Splits**:
- `train-clean-100/` - Training data (100 hours)
- `dev-clean/` - Development set (for validation)
- `test-clean/` - Test set (for evaluation)

**How it's downloaded**:
```python
# In transformer_train_complete.py
from datasets import load_dataset
dataset = load_dataset(
    "openslr/librispeech_asr",
    "clean",
    split="train.100",
    streaming=True,  # Streams data, doesn't fully download
    trust_remote_code=True
)
```

**How it's used**:
- Streamed from Hugging Face Hub
- Cached locally in `speech_datasets/processed/`
- Used for Phase 1 training with 5000 samples
- Features: MFCC (Mel-Frequency Cepstral Coefficients)

#### 2. **Personal Voice Dataset** (Phase 2 Fine-tuning)
**Location**: `voice_data/train/` and `voice_data/val/`
**Format**: 
- `.wav` files (audio)
- `.txt` files (transcriptions)
**How to add**:
```
voice_data/train/
├── sample1.wav
├── sample1.txt (content: "FIND COMPUTER SCIENCE BOOKS")
├── sample2.wav
├── sample2.txt (content: "SEARCH FOR PYTHON PROGRAMMING")
└── ... (20+ samples recommended)
```

**How it's loaded**:
```python
# In train_phase2_personal_voice()
for audio_file in Path('voice_data/train').glob('*.wav'):
    text_file = audio_file.with_suffix('.txt')
    audio, sr = librosa.load(audio_file, sr=16000)
    # Process and add to training dataset
```

#### 3. **Training Data Manifests**
**Location**: `speech_datasets/manifests/`
**Files**:
- `train.jsonl` - Training manifest (paths, text)
- `dev.jsonl` - Development manifest
- `test.jsonl` - Test manifest
**Format**: JSON Lines (one JSON object per line)
```json
{
  "audio_filepath": "path/to/audio.flac",
  "text": "TRANSCRIPTION TEXT",
  "dataset": "LibriSpeech",
  "source_split": "train"
}
```

#### 4. **Synthetic Training Data** (Generated on-the-fly)
**Created by**: transformer_train_complete.py
**How**: Random white noise → 1-5 second audio clips
**Paired with**: 100+ library-related text phrases
**Example**:
- Audio: Synthetic 3-second noise
- Text: "FIND BOOKS IN ENGINEERING DEPARTMENT"

#### 5. **Cached Preprocessed Features**
**Location**: `speech_datasets/processed/wav2vec2-base-960h/`
**What**: Pre-computed Wav2Vec2 hidden states
**Why**: Faster training (features cached, only LSTM adapter trains)
**How created**:
```python
# In preprocessing
inputs = processor(audio, sampling_rate=16000)
with torch.inference_mode():
    hidden = encoder(input_values=inputs).last_hidden_state
# Save to cache
```

---

## How Datasets are Downloaded/Uploaded

### Download Flow

```
Training Start
    ↓
Check if LibriSpeech exists in speech_datasets/LibriSpeech/
    ├─ NO: Download from Hugging Face Hub (OpenSlr)
    │   ├─ URL: https://huggingface.co/datasets/openslr/librispeech_asr
    │   ├─ Method: load_dataset() with streaming=True
    │   ├─ Caching: Stored in ~/.cache/huggingface/datasets/
    │   └─ Size: ~100GB (full) or streamed on-demand
    │
    └─ YES: Use local copy
         └─ Faster training, no internet needed

Check if voice_data/train/ has personal recordings
    ├─ NO: Training skips Phase 2 or uses synthetic data
    │   └─ Creates dummy audio samples for demo
    │
    └─ YES: Load from local directory
         ├─ Read .wav files with librosa
         ├─ Match with .txt transcriptions
         └─ Add to training dataset
```

### Upload Flow (For Your Personal Voice)

```
You record voice samples
    ↓
Save as WAV files
    ↓
Copy to voice_data/train/ or voice_data/val/
    ├─ Format: sample1.wav + sample1.txt
    ├─ Duration: 1-5 seconds per clip
    ├─ Quantity: 20+ samples minimum
    └─ Text: UPPERCASE, 2-120 characters

Run Phase 2 training
    ↓
Script loads from voice_data/train/
    ↓
Preprocesses (resample to 16kHz, extract features)
    ↓
Fine-tunes model on your voice
    ↓
Saves improved model to ./transformer_model/
    ↓
Service uses your personal voice-adapted model
```

---

## Complete System Connections Map

```
┌────────────────────────────────────────────────────────────────┐
│                         FRONTEND                               │
│  (React @ http://localhost:3000 or :5173)                     │
│  ├─ voiceSearch.js ────→ Records audio                         │
│  └─ tts.js ────→ Requests audio playback                       │
└──────────────────────┬─────────────────────────────────────────┘
                       │
                       │ HTTP/JSON
                       ▼
┌────────────────────────────────────────────────────────────────┐
│                      PHP BACKEND                               │
│  (http://localhost/digital-library/backend)                    │
│                                                                │
│  routes/api.php ─────→ Routes requests                         │
│  ├─ /voice-search/search ──→ STT pipeline                     │
│  ├─ /tts ──────────────────→ TTS pipeline                     │
│  └─ /api/ai/models ────────→ Model status                     │
│                                                                │
│  services/                                                     │
│  ├─ SearchService.php ───→ Query books                        │
│  ├─ STTService.php ──────→ Call Python STT                    │
│  └─ TTSService.php ──────→ Call gTTS                          │
└────────────┬─────────────────────────────────┬────────────────┘
             │                                 │
        HTTP POST                         Python subprocess
             │                                 │
      ┌──────┴──────────┐                      ▼
      │                 │           ┌─────────────────────┐
      │                 │           │ STT Services        │
      │                 │           │                     │
      │                 │           ├─ Port 5004:         │
      │                 │           │  transformer_speech │
      │                 │           │  _service.py ⭐     │
      │                 │           │                     │
      │                 │           ├─ Port 5003:         │
      │                 │           │  wav2vec2_service   │
      │                 │           │                     │
      │                 │           └─ Port 5001:         │
      │                 │              Whisper (fallback) │
      │                 │                                 │
      ▼                 ▼                                 ▼
┌──────────────┐  ┌──────────────────┐  ┌───────────────────────┐
│  MYSQL DB    │  │  File Storage    │  │  ML Models            │
│              │  │  backend/uploads │  │                       │
├──────────────┤  ├──────────────────┤  ├───────────────────────┤
│ books        │  │ audio/           │  │ transformer_model/    │
│ authors      │  │ └─ uploads.wav   │  │ ├─ pytorch_model.bin  │
│ voice_search │  │                  │  │ ├─ config.json        │
│ _logs        │  │ tts/             │  │ └─ tokenizer.json     │
│              │  │ └─ <hash>.mp3    │  │                       │
│ tts_logs     │  │                  │  │ wav2vec2_adapter/     │
│              │  │                  │  │ (fallback model)      │
│ departments  │  │                  │  │                       │
│ faculties    │  │                  │  │ transformer_lib       │
│              │  │                  │  │ rispeech_model/       │
│ categories   │  │                  │  │ (Phase 1 checkpoint)  │
└──────────────┘  └──────────────────┘  └───────────────────────┘
```

---

## How to Run the Complete Project

### Prerequisites
```bash
# 1. Install Python dependencies
pip install torch torchaudio librosa transformers datasets evaluate scipy flask

# 2. Install PHP dependencies
composer install

# 3. Install Node dependencies
npm install

# 4. Start MySQL
# On Windows with XAMPP:
# Open XAMPP Control Panel → Start Apache + MySQL

# 5. Create database
# Use phpMyAdmin or run:
mysql -u root < database/database.sql
```

### Step-by-Step Execution

**Terminal 1: Start Backend API**
```bash
cd c:\xampp\htdocs\digital-library

# PHP backend runs automatically with Apache
# Verify:
curl http://localhost/digital-library/backend/health
# Should return: {"status":"healthy"}
```

**Terminal 2: Start STT Service**
```bash
cd c:\xampp\htdocs\digital-library
python scripts/transformer_speech_service.py

# Output:
# Starting Transformer Speech-to-Text Service on port 5004
# Running on http://127.0.0.1:5004
```

**Terminal 3: Start Frontend Dev Server**
```bash
cd c:\xampp\htdocs\digital-library\frontend
npm install
npm run dev

# Output:
# VITE v4.3.0 ready in 234 ms
# ➜ Local: http://localhost:5173/
```

**Terminal 4: Start Training (Optional)**
```bash
cd c:\xampp\htdocs\digital-library

# If you have personal voice data:
python scripts/transformer_train_complete.py --phase all

# Output:
# [PHASE 1] LibriSpeech Training
# Loaded model: 94,396,320 parameters
# Starting training...
```

### Full Execution Checklist

- [ ] **MySQL running** - Check phpMyAdmin at http://localhost/phpmyadmin
- [ ] **Database created** - Check: `mysql -u root ines_intelligent_library -e "SHOW TABLES;"`
- [ ] **Apache running** - Backend available at http://localhost/digital-library/backend
- [ ] **STT Service running** - Check: http://127.0.0.1:5004/health
- [ ] **Frontend running** - Open http://localhost:5173
- [ ] **Test voice search** - Click record button, speak "FIND COMPUTER SCIENCE BOOKS"
- [ ] **Check logs** - View voice_search_logs table in MySQL

### Quick Test

```bash
# Test STT endpoint
curl -F "audio=@test.wav" http://127.0.0.1:5004/api/stt/transcribe

# Test backend
curl http://localhost/digital-library/backend/api/ai/models

# View database logs
mysql ines_intelligent_library -e "SELECT * FROM voice_search_logs ORDER BY created_at DESC LIMIT 5;"
```

---

## Summary

| Component | Status | Location | How It Connects |
|-----------|--------|----------|-----------------|
| **Frontend** | Ready | `frontend/` | POSTs audio to PHP backend |
| **PHP Backend** | Ready | `backend/` | Routes to STT, queries DB |
| **MySQL Database** | Ready | `database/` | Stores books, searches, users |
| **Transformer Model** | Training | `ml-speech/models/transformer_model/` | Inference service on port 5004 |
| **STT Service** | Ready to run | `scripts/transformer_speech_service.py` | Loads model, transcribes audio |
| **gTTS** | Ready | `scripts/gtts_synthesize.py` | Generates audio from text |
| **LibriSpeech Dataset** | Streamed | `speech_datasets/LibriSpeech/` | Downloaded on-demand from HF |
| **Personal Voice Data** | Ready | `voice_data/train/` | Add your WAV+TXT files |

**READY TO RUN:** Follow the 4-terminal setup above to start the complete system!
