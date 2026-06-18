# STT, TTS, Backend Connection, and ML Process Explanation

## 1. Meaning of the STT training-process image

The image explains the speech-to-text model preparation and evaluation flow used by the project. It should be described as a transfer-learning and limited fine-tuning workflow, not as training a speech model from zero.

1. **LibriSpeech pairs**: The project used real English audio and transcript pairs from LibriSpeech. Each audio file has a matching correct text transcript. Local manifest files are stored in `speech_datasets/manifests/`.
2. **Preprocessing**: Audio is converted to a consistent format: mono channel, 16 kHz sampling rate, normalized waveform, padded batches, and normalized transcript labels.
3. **Pretrained Wav2Vec2**: The model starts from pretrained Wav2Vec2 knowledge rather than learning speech from nothing. The base model is `facebook/wav2vec2-base-960h`.
4. **CTC supervised fine-tuning**: The project uses `Wav2Vec2ForCTC`, meaning Wav2Vec 2.0 with a Connectionist Temporal Classification output head. In the recorded local experiment, only the CTC head was fine-tuned while the main encoder was frozen.
5. **Development set and test set**: Held-out utterances are used to evaluate the model. The logged evaluation subset used 40 development utterances and 60 test utterances.
6. **Metrics**: The model was evaluated using WER, CER, word accuracy, F1, and ROC-AUC. WER and CER are the most important ASR metrics because they measure transcription errors directly.

Important defense wording:

> The model was not trained from scratch. The project used transfer learning from a pretrained Wav2Vec2ForCTC model and performed limited local CTC-head fine-tuning and evaluation. The resulting local model folder is `transformer_model`, and the live STT service loads it when available.

Evidence files:

- `transformer_model/`: local model used by the running STT service.
- `models/stt/transformer_metrics.json`: recorded fine-tuning and evaluation evidence.
- `speech_datasets/manifests/train.jsonl`: 28,539 available local train manifest rows.
- `speech_datasets/manifests/dev.jsonl`: 2,703 available local development manifest rows.
- `speech_datasets/manifests/test.jsonl`: 2,620 available local test manifest rows.
- Logged experiment subset: 640 training utterances, 40 development utterances, and 60 test utterances.

## 2. How Speech-to-Text connects to the backend

Speech-to-text begins in the React frontend when a user records microphone audio.

Frontend connection points:

- `frontend/src/pages/library/VoiceSearch.jsx`
- `frontend/src/pages/library/SearchBooks.jsx`
- `frontend/src/api/voiceSearch.js`

Process:

1. The browser records microphone audio using `MediaRecorder`.
2. The frontend creates a `FormData` payload and attaches the audio file as `audio`.
3. The frontend sends the payload to the PHP backend endpoint `POST /voice-search/search`.
4. The backend receives the request in `backend/routes/api.php`.
5. The backend function `local_open_vocabulary_transcribe()` forwards the uploaded audio to the local Transformer STT FastAPI service:
   - Primary STT service: `http://127.0.0.1:5006/api/stt/transcribe`
   - Script: `scripts/transformer_speech_service.py`
6. If the Transformer service fails, the backend can try the Whisper fallback service:
   - Fallback STT service: `http://127.0.0.1:5001/transcribe`
   - Script: `scripts/whisper_stt_service.py`
7. The backend receives the transcript and uses it to search the MySQL catalog.
8. The transcript, matching books, model name, provider, confidence, and processing time are returned to the frontend.

Backend connection points:

- `backend/routes/api.php`
- `local_open_vocabulary_transcribe()`
- `POST /voice-search/search`
- `service_upload_audio('http://127.0.0.1:5006/api/stt/transcribe', ...)`
- `service_upload_audio('http://127.0.0.1:5001/transcribe', ...)`

Python STT service:

- `scripts/transformer_speech_service.py`
- Loads `transformer_model` if available.
- Otherwise falls back to `facebook/wav2vec2-base-960h`.
- Normalizes browser audio to 16 kHz mono.
- Uses `Wav2Vec2Processor` and `Wav2Vec2ForCTC`.
- Returns transcript, confidence, model path, and language.

## 2.1 ASR evaluation metrics to add in the dissertation

Add this subsection after the Wav2Vec2/CTC training explanation in **Chapter 3, Machine Learning Methodology**. You can also summarize the results again in **Chapter 4, Testing and Results**.

Suggested text:

Automatic Speech Recognition (ASR) quality was evaluated mainly using Word Error Rate (WER) and Character Error Rate (CER), because these metrics directly measure transcription errors between the predicted transcript and the correct reference transcript. WER evaluates errors at word level, while CER evaluates errors at character level.

Word Error Rate (WER) is calculated as:

`WER = (S + D + I) / N`

Where:

- `S` means Substitutions: words that were replaced by wrong words.
- `D` means Deletions: words that were missing from the prediction.
- `I` means Insertions: extra words added by the prediction.
- `N` means the total number of words in the correct reference transcript.

Character Error Rate (CER) is calculated as:

`CER = (Sc + Dc + Ic) / Nc`

Where:

- `Sc` means character substitutions.
- `Dc` means character deletions.
- `Ic` means character insertions.
- `Nc` means the total number of characters in the correct reference transcript.

The project also reports Word Accuracy as a derived measure from WER:

`Word Accuracy = max(0, 1 - WER) x 100`

This means that if WER is low, word accuracy is high. The `max(0, ...)` part prevents the accuracy from becoming negative when WER is greater than 1.

Exact Sentence Accuracy measures how many complete sentences were transcribed perfectly:

`Exact Sentence Accuracy = (Number of exactly matched sentences / Total evaluated sentences) x 100`

Precision measures how many predicted tokens were correct:

`Precision = TP / (TP + FP)`

Where:

- `TP` means True Positives: tokens correctly predicted by the model.
- `FP` means False Positives: tokens predicted by the model but not present in the reference. Insertions and substitutions contribute to false positives.

Recall measures how many reference tokens were successfully recovered:

`Recall = TP / (TP + FN)`

Where:

- `FN` means False Negatives: reference tokens missed by the model. Deletions and substitutions contribute to false negatives.

F1-score balances precision and recall:

`F1 = (2 x Precision x Recall) / (Precision + Recall)`

F1 is useful because it gives one score that considers both wrong extra predictions and missing reference tokens.

Receiver Operating Characteristic Area Under the Curve (ROC-AUC) measures ranking quality across decision thresholds. In this project, ROC-AUC is calculated as token-presence ROC-AUC over the 32-token CTC vocabulary. The evaluation compares whether a token occurs in the reference transcript with the model's maximum frame probability for that token. This ROC-AUC value is secondary evidence; the primary ASR quality metrics are still WER and CER.

Defense note:

> WER and CER are the most important ASR metrics in this project because the goal is accurate transcription. Word Accuracy, Exact Sentence Accuracy, Precision, Recall, F1, and ROC-AUC are supporting metrics that help explain performance from different angles.

## 3. How Text-to-Speech connects to the backend

Text-to-speech begins when the reader page has readable page text and prepares narration.

Frontend connection points:

- `frontend/src/pages/library/Reader.jsx`
- `frontend/src/pages/library/PersonalReader.jsx`
- `frontend/src/api/tts.js`
- `frontend/src/utils/audioPlayback.js`

Process:

1. The reader extracts the current page text or personal-book section text.
2. The frontend sends text to the backend endpoint `POST /tts`.
3. The backend receives the request in `backend/routes/api.php`.
4. The backend cleans the text to reduce OCR noise and pronunciation errors.
5. If the frontend requests `provider: "clear"`, the backend tries gTTS first for clearer narration.
6. If SpeechT5 is requested or gTTS is unavailable, the backend uses SpeechT5.
7. SpeechT5 is served through the persistent FastAPI service on port 5007:
   - Service URL: `http://127.0.0.1:5007/synthesize`
   - Script: `scripts/speecht5_tts_service.py`
8. The backend saves generated audio in `backend/uploads/tts/{user_id}/`.
9. The backend returns an audio URL like `/tts/audio/{file}.mp3` or `/tts/audio/{file}.wav`.
10. The frontend builds the full audio URL and plays it through the hidden HTML audio element.

Backend connection points:

- `backend/routes/api.php`
- `POST /tts`
- `GET /tts/audio/{file}`
- `generate_narration_audio()`
- `generate_gtts_audio()`
- `generate_speecht5_audio()`
- `generate_speecht5_service_audio()`
- `service_json_post('http://127.0.0.1:5007/synthesize', ...)`

Python TTS services/scripts:

- `scripts/speecht5_tts_service.py`: persistent FastAPI SpeechT5 service on port 5007.
- `scripts/speecht5_synthesize.py`: SpeechT5 CLI fallback and preload health.
- `scripts/gtts_synthesize.py`: gTTS MP3 generation.

## 3.1 SpeechT5 text-to-speech documentation to add

Add this under **Chapter 3, System Design / AI Service Design** and repeat the implemented connection under **Chapter 4, Implementation**.

Suggested text:

The system includes a Text-to-Speech (TTS) component that converts readable book or page text into audio narration. The main local neural TTS option is SpeechT5, a transformer-based speech model from Hugging Face. SpeechT5 receives cleaned text from the backend and generates waveform audio that can be played by the frontend reader.

In the implemented system, the React reader page does not call SpeechT5 directly. The reader sends text to the PHP backend endpoint `POST /tts`. The backend validates the logged-in user, cleans the text, chooses the TTS provider, and calls the local SpeechT5 FastAPI service on port `5007`. The generated audio is saved under `backend/uploads/tts/{user_id}/`, and the backend returns an audio URL to the frontend for playback.

SpeechT5 is preloaded before the live demo to avoid first-playback failure. The startup script `scripts/start_ai_services.ps1` starts the persistent SpeechT5 FastAPI service, and `scripts/dev_system.ps1` checks backend health to confirm that SpeechT5 is ready. The backend `/health` endpoint reports TTS readiness so the live demo does not begin while the speech model is still cold.

Important file locations:

- Frontend reader playback: `frontend/src/pages/library/Reader.jsx`
- Personal reader playback: `frontend/src/pages/library/PersonalReader.jsx`
- Frontend TTS API helper: `frontend/src/api/tts.js`
- Backend TTS endpoint and provider selection: `backend/routes/api.php`
- SpeechT5 FastAPI service: `scripts/speecht5_tts_service.py`
- SpeechT5 synthesis/preload script: `scripts/speecht5_synthesize.py`
- Startup/preload script: `scripts/start_ai_services.ps1`
- Full development startup script: `scripts/dev_system.ps1`

Limitations to mention:

- SpeechT5 can be slower on CPU because neural speech generation is computationally expensive.
- SpeechT5 pronunciation quality depends on cleaned input text. OCR mistakes, broken words, symbols, and bad spacing can make the voice pronounce words wrongly.
- Very long page text should be chunked or shortened because long input increases synthesis delay.
- gTTS is available as a clearer fallback, but it depends on internet access.

## 4. Technical issues that might occur and why

### STT issues

- **Microphone permission denied**: The browser cannot record audio if the user blocks microphone access.
- **Browser does not support recording**: Some browsers do not support `MediaRecorder` correctly.
- **No audio captured**: The microphone may be muted, unavailable, or the recording may be too short.
- **Slow transcription**: Wav2Vec2 inference is CPU-heavy. Without GPU acceleration, processing may take longer.
- **Wrong transcript**: Accent, background noise, low volume, long utterances, and unclear pronunciation can reduce recognition accuracy.
- **STT service offline**: If port 5006 is not running, the backend cannot use the Transformer service and may fall back to Whisper.
- **FFmpeg missing or failing**: Browser audio may need conversion to 16 kHz mono. If conversion fails, transcription may fail.
- **Low confidence**: The backend may receive a transcript but mark it low confidence when the model is uncertain.

### TTS issues

- **Delay before playback**: SpeechT5 is a neural model and can be slow on CPU. The persistent service reduces cold-start delay by keeping the model loaded.
- **Noisy or wrong pronunciation**: OCR text may contain broken words, strange symbols, bad spacing, or page artifacts. TTS reads what it receives.
- **SpeechT5 rough voice quality**: SpeechT5 can sound less clear than gTTS for some academic/OCR text.
- **gTTS internet dependency**: gTTS needs internet access because it uses Google TTS. If internet is unavailable, the backend should fall back to SpeechT5.
- **Browser blocks playback**: Browsers may block audio unless playback begins from a user gesture such as clicking Play.
- **Audio URL unauthorized**: Generated audio is protected by token. If the token is missing or expired, playback may fail.
- **Long page text**: Very long text takes longer to synthesize and may exceed backend or service limits. The reader sends shorter excerpts for faster playback.

### Backend/database issues

- **Apache/PHP not running**: The frontend cannot reach backend endpoints.
- **MySQL not running**: Login, books, borrowing, logs, and reports cannot load.
- **Uploads folder not writable**: Book files, generated audio, extracted pages, and covers may fail to save.
- **Wrong API base URL**: If `VITE_API_BASE_URL` points to the wrong backend, frontend requests fail.
- **Expired token**: Protected routes and protected file/audio downloads return unauthorized errors.

### Deployment issues

- **Static frontend hosting alone is not enough**: The app also needs PHP, MySQL, and Python FastAPI services.
- **Python services must stay running**: STT/TTS will fail if ports 5001, 5006, or 5007 are not active.
- **Resource limits**: Speech models require memory and CPU/GPU resources; weak hosting can cause delays or crashes.
- **CORS/HTTPS configuration**: If frontend and backend are on different domains, CORS and secure URLs must be configured.

## 5. Where this should appear in the dissertation

- Put the STT training-process image under **Chapter 3, Machine Learning Methodology**, because it explains the model preparation process.
- Put use case diagrams, flowcharts, DFD, and ERD under **Chapter 3, System Design**.
- Put implemented architecture, API endpoint table, health checks, and service connections under **Chapter 4, System Implementation and Results**.
- Put technical limitations and deployment risks under **Chapter 5, Limitations and Recommendations**.
