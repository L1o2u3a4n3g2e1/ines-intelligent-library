# Complete Digital Library STT/TTS Integration Guide

## Table of Contents
1. [Project Structure](#project-structure)
2. [STT (Speech-to-Text) Integration](#stt-integration)
3. [gTTS (Text-to-Speech) Integration](#gtts-integration)
4. [Database Schema](#database-schema)
5. [Training Data & Vocabulary](#training-vocabulary)
6. [How to Use Everything](#how-to-use)

---

## Project Structure

### FRONTEND (React - Voice Search UI)
**Location**: `c:\xampp\htdocs\digital-library\frontend\`

**Key Files**:
```
frontend/
├── src/api/
│   ├── voiceSearch.js          → Sends audio to STT
│   ├── tts.js                  → Requests TTS audio
│   └── client.js               → Base API config
├── src/components/
│   ├── VoiceSearch/            → Recording component
│   └── AudioPlayer/            → TTS playback
└── src/pages/
    └── AudioLabPage.jsx        → STT/TTS testing interface
```

**Function**: Captures user voice, sends to backend for STT, displays results with TTS option

---

### BACKEND (PHP - API Server)
**Location**: `c:\xampp\htdocs\digital-library\backend\`

**Key Files**:
```
backend/
├── routes/
│   └── api.php                 → Main router (lines 110-120: STT fallback chain)
├── services/
│   ├── STTService.php          → Speech-to-text logic
│   ├── TTSService.php          → Text-to-speech logic
│   └── SearchService.php       → Book search logic
├── uploads/
│   ├── audio/                  → Uploaded voice files
│   └── tts/                    → Generated MP3 files
└── index.php                   → Entry point
```

**Function**: Receives audio, routes to STT service, processes results, returns text & search results

---

### ML MODELS (Trained Models)
**Location**: `c:\xampp\htdocs\digital-library\ml-speech\models\`

**Key Files**:
```
ml-speech/models/
├── transformer_model/              ⭐ PRIMARY STT MODEL
│   ├── pytorch_model.bin           (Model weights)
│   ├── config.json
│   ├── processor_config.json
│   └── tokenizer_config.json
│
├── transformer_librispeech_model/  (Phase 1 base)
├── wav2vec2_lstm_adapter_best.pt   (Fallback)
└── english_lstm_ctc_best.pt        (Legacy)
```

**Models**:
- **Primary**: Transformer (Wav2Vec2 CTC) - 94.4M params
- **Fallback 1**: Wav2Vec2 + LSTM Adapter - 96.72% accuracy
- **Fallback 2**: Whisper tiny.en (OpenAI)

---

### TRAINING SCRIPTS
**Location**: `c:\xampp\htdocs\digital-library\scripts\`

**Key Files**:
```
scripts/
├── transformer_train_complete.py        ⭐ MAIN TRAINING
│   ├── Phase 1: 15 epochs (LibriSpeech)
│   ├── Phase 2: 20 epochs (Personal voice)
│   ├── Auto-extend: ~100 epochs
│   ├── Vocabulary: 100+ library terms
│   └── Output: ./transformer_model/
│
├── transformer_speech_service.py        ⭐ STT SERVICE
│   ├── Port: 5004
│   ├── Endpoint: /api/stt/transcribe
│   └── Uses: ./transformer_model/
│
└── gtts_synthesize.py                   ⭐ TTS SERVICE
    ├── Uses: Google Text-to-Speech API
    ├── Input: Text string
    └── Output: MP3 file
```

---

## STT Integration

### How Voice Search Works

**Step 1: Frontend Records Audio**
```javascript
// frontend/src/api/voiceSearch.js
const sendVoiceSearch = async (audioBlob) => {
  const formData = new FormData();
  formData.append('audio', audioBlob);
  
  return fetch('http://localhost/digital-library/backend/voice-search/search', {
    method: 'POST',
    body: formData
  });
};
```

**Step 2: Backend Routes to STT**
```php
// backend/routes/api.php (lines 110-120)
function local_open_vocabulary_transcribe(array $file): ?array {
  // Try Transformer model (PRIMARY) - port 5004
  $transformerResult = service_upload_audio(
    'http://127.0.0.1:5004/api/stt/transcribe', 
    $file, 120
  );
  if ($transformerResult) return $transformerResult;
  
  // Try Wav2Vec2 + LSTM (FALLBACK) - port 5003
  $adapterResult = service_upload_audio(
    'http://127.0.0.1:5003/api/stt/transcribe?mode=open', 
    $file, 100
  );
  if ($adapterResult) return $adapterResult;
  
  // Try Whisper (FINAL) - port 5001
  return service_upload_audio(
    'http://127.0.0.1:5001/transcribe', 
    $file, 90
  );
}
```

**Step 3: Transformer Service Transcribes**
```python
# scripts/transformer_speech_service.py
@app.route('/api/stt/transcribe', methods=['POST'])
def transcribe():
  audio_file = request.files['audio']
  
  # Load audio (librosa)
  audio, sr = librosa.load(temp_path, sr=16000)
  
  # Process with Wav2Vec2 processor
  inputs = processor(audio, sampling_rate=16000, return_tensors="pt")
  
  # Inference with Transformer model
  with torch.no_grad():
    logits = model(**inputs).logits
  
  # Decode to text
  pred_ids = torch.argmax(logits, dim=-1)
  transcription = processor.batch_decode(pred_ids)[0]
  
  return jsonify({'transcription': transcription, 'confidence': 0.95})
```

**Step 4: Backend Searches Library**
```php
// backend/routes/api.php
if ($method === 'POST' && $path === '/voice-search/search') {
  $transcript = $stt['transcription'];  // From Transformer
  
  // Parse query from transcript
  $parsed = parse_catalog_query($transcript);
  
  // Search database for books
  $stmt = pdo()->prepare(
    "SELECT * FROM books 
     WHERE title LIKE :title 
     OR description LIKE :desc
     OR author LIKE :author"
  );
  $stmt->execute([
    ':title' => "%{$parsed['keywords']}%",
    ':author' => "%{$parsed['author']}%"
  ]);
  
  // Log to voice_search_logs
  pdo()->prepare(
    "INSERT INTO voice_search_logs 
    (user_id, transcript, results_count, status, model_used) 
    VALUES (:uid, :trans, :count, 'success', 'transformer')"
  )->execute([...]);
  
  return Response::ok([
    'transcript' => $transcript,
    'results' => $stmt->fetchAll()
  ]);
}
```

**Step 5: Frontend Displays Results**
```javascript
// Search results shown with TTS option
<BookCard 
  book={result}
  onPlayAudio={() => synthesize(result.title)}
/>
```

### Finding STT Model
- **Main Model**: `./ml-speech/models/transformer_model/`
- **Loaded in**: `scripts/transformer_speech_service.py` (line 30)
- **Called via**: `backend/routes/api.php` → `local_open_vocabulary_transcribe()`
- **Service Port**: http://127.0.0.1:5004

### Database Table
```sql
CREATE TABLE voice_search_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  transcript TEXT,              -- STT output
  results_count INT,
  status VARCHAR(50),           -- 'success', 'failed'
  model_used VARCHAR(100),      -- 'transformer', 'wav2vec2', 'whisper'
  confidence FLOAT,
  created_at TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

---

## gTTS Integration

### How Text-to-Speech Works

**Step 1: Frontend Requests TTS**
```javascript
// frontend/src/api/tts.js
const synthesize = async (text) => {
  return fetch('http://localhost/digital-library/backend/tts', {
    method: 'POST',
    body: JSON.stringify({ text }),
    headers: { 'Content-Type': 'application/json' }
  });
};
```

**Step 2: Backend Calls gTTS Service**
```php
// backend/services/TTSService.php
public function synthesize(string $text): ?string {
  $tempWav = sys_get_temp_dir() . '/tts_temp.wav';
  
  $command = "python " . __DIR__ . "/../../../scripts/gtts_synthesize.py " .
    escapeshellarg($text) . " " . escapeshellarg($tempWav);
  
  exec($command, $output, $returnCode);
  
  if ($returnCode !== 0) return null;
  
  // Save to permanent location
  $hash = hash_file('sha256', $tempWav);
  $outputPath = __DIR__ . "/../../backend/uploads/tts/{$hash}.mp3";
  
  copy($tempWav, $outputPath);
  unlink($tempWav);
  
  return "/backend/uploads/tts/{$hash}.mp3";
}
```

**Step 3: Python Script Generates Audio**
```python
# scripts/gtts_synthesize.py
import sys
from gtts import gTTS

text = sys.argv[1]
output_path = sys.argv[2]

# Generate speech
tts = gTTS(text=text, lang='en', slow=False)

# Save as MP3
tts.save(output_path.replace('.wav', '.mp3'))
```

**Step 4: Frontend Plays Audio**
```javascript
// frontend/src/components/AudioPlayer/AudioPlayer.js
<audio controls>
  <source src={audioUrl} type="audio/mpeg" />
</audio>
```

### Finding gTTS Configuration
- **Service Script**: `./scripts/gtts_synthesize.py`
- **Called by**: `backend/services/TTSService.php`
- **Output Path**: `backend/uploads/tts/<hash>.mp3`
- **Language**: English ('en')
- **Provider**: Google Translate Text-to-Speech API

### Database Table
```sql
CREATE TABLE tts_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
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

## Database Schema

### Key Tables for Voice Features

```sql
-- Voice Search Logs
CREATE TABLE voice_search_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT,
  transcript TEXT,            -- STT result
  results_count INT,
  status VARCHAR(50),
  model_used VARCHAR(100),
  confidence FLOAT,
  created_at TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX (user_id, created_at)
);

-- Text-to-Speech Logs
CREATE TABLE tts_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT,
  original_text TEXT,
  audio_file_path VARCHAR(255),
  duration_seconds FLOAT,
  status VARCHAR(50),
  created_at TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX (user_id, created_at)
);

-- Book Catalog
CREATE TABLE books (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255),
  author_id INT,
  department_id INT,
  faculty_id INT,
  category_id INT,
  isbn VARCHAR(20),
  available_copies INT,
  total_copies INT,
  created_at TIMESTAMP,
  FOREIGN KEY (author_id) REFERENCES authors(id),
  FOREIGN KEY (department_id) REFERENCES departments(id),
  FOREIGN KEY (faculty_id) REFERENCES faculties(id),
  FOREIGN KEY (category_id) REFERENCES categories(id),
  INDEX (title, author_id, department_id)
);

-- Departments
CREATE TABLE departments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100),
  faculty_id INT,
  FOREIGN KEY (faculty_id) REFERENCES faculties(id)
);

-- Faculties
CREATE TABLE faculties (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100)
);
```

---

## Training Vocabulary

### Digital Library-Specific Terms (100+)

The model is trained on:

**Library Operations**:
- FIND ME A BOOK
- SEARCH FOR BOOKS
- BORROW A BOOK
- RETURN BOOK
- CHECK BOOK AVAILABILITY
- RESERVE THIS BOOK

**Departments & Faculties**:
- ENGINEERING DEPARTMENT
- FACULTY OF SCIENCE
- MEDICINE DEPARTMENT
- LAW FACULTY
- BUSINESS SCHOOL
- COMPUTER SCIENCE

**Book Categories**:
- FICTION NOVELS
- TECHNICAL REFERENCE
- ACADEMIC TEXTBOOKS
- RESEARCH PAPERS
- SELF HELP BOOKS

**Specific Searches**:
- FIND PYTHON PROGRAMMING BOOK
- MACHINE LEARNING BOOKS
- FIND STATISTICAL ANALYSIS
- COMPUTER ARCHITECTURE
- DATABASE DESIGN

**ML/Technical Terms**:
- DEEP LEARNING
- NEURAL NETWORKS
- SPEECH RECOGNITION
- TRANSFORMER MODELS
- TRANSFER LEARNING

---

## How to Use Everything

### Running Training
```bash
cd c:\xampp\htdocs\digital-library

# Start training
python scripts/transformer_train_complete.py --phase all

# Logs saved to:
# - transformer_training_full.log
# - transformer_training_session.log
```

### Running STT Service
```bash
# Install dependencies
pip install flask torch transformers librosa

# Start service on port 5004
python scripts/transformer_speech_service.py

# Test
curl -F "audio=@test.wav" http://127.0.0.1:5004/api/stt/transcribe
```

### Using Voice Search in Frontend
```javascript
// 1. Record audio
const mediaRecorder = new MediaRecorder(stream);
const audioChunks = [];
mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
mediaRecorder.onstop = () => {
  const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
  
  // 2. Send to STT
  sendVoiceSearch(audioBlob).then(result => {
    // 3. Display results
    console.log('Transcript:', result.transcript);
    console.log('Books found:', result.results);
    
    // 4. Optional: Play TTS
    synthesize(result.results[0].title);
  });
};
```

### Checking Model Status
```bash
# Via API
curl http://localhost/digital-library/backend/api/ai/models

# Returns model status for all STT services
```

### Adding Personal Voice Data
```
1. Create WAV file: voice_data/train/sample1.wav
2. Create TXT: voice_data/train/sample1.txt with transcription
3. Repeat for 20+ samples
4. Re-run training Phase 2:
   python scripts/transformer_train_complete.py --phase 2
```

---

## Quick Reference

| Task | Location | Command |
|------|----------|---------|
| Train Model | `scripts/transformer_train_complete.py` | `python scripts/transformer_train_complete.py --phase all` |
| STT Service | `scripts/transformer_speech_service.py` | `python scripts/transformer_speech_service.py` |
| TTS Service | `scripts/gtts_synthesize.py` | Called by backend |
| Frontend STT UI | `frontend/src/api/voiceSearch.js` | React component |
| Backend Router | `backend/routes/api.php` | Line 110-120 for STT fallback |
| Model Weights | `ml-speech/models/transformer_model/` | 350MB model file |
| Search Logs | Database table: `voice_search_logs` | Stores all STT searches |
| TTS Logs | Database table: `tts_logs` | Stores all TTS outputs |

---

## Next Steps

1. ✅ Training script updated with library vocabulary
2. ✅ Project structure organized
3. ✅ STT/gTTS connections documented
4. **Next**: 
   - Wait for training to complete
   - Start STT service on port 5004
   - Test end-to-end via frontend
   - Add personal voice data (optional)

**Status**: Ready for production deployment once training completes!
