# INES Digital Library: Features, AI, Data, and Architecture Guide

## 1. Password reset

The working recovery flow is:

1. The user enters one account email in `frontend/src/pages/auth/ForgotPassword.jsx`.
2. The frontend calls `POST /auth/forgot-password` through `frontend/src/api/auth.js`.
3. `backend/routes/api.php` creates a random 64-character token, stores only its SHA-256 hash in `password_resets`, and expires older active tokens.
4. The local development installation returns a one-hour reset link because email delivery is not configured.
5. `frontend/src/pages/auth/ResetPassword.jsx` validates the token and email before enabling the password form.
6. The backend requires at least 10 characters with uppercase, lowercase, number, and symbol characters.
7. A successful reset marks the token as used and invalidates existing login tokens.

The database table is `password_resets` in `database/database.sql`.

Production note: the backend deliberately does not reveal whether an email exists. A deployed version still needs an SMTP/email provider to deliver the link instead of showing the local development button.

## 2. Speech-to-text (STT)

### Primary STT

The primary recognizer is a Wav2Vec2 Transformer with a CTC output head:

- Service: `scripts/transformer_speech_service.py`
- Active local model folder: `transformer_model/`
- Original base model: `facebook/wav2vec2-base-960h`
- HTTP service: `http://127.0.0.1:5006/api/stt/transcribe`
- Frontend page: `frontend/src/pages/library/VoiceSearch.jsx`
- PHP integration: `local_open_vocabulary_transcribe()` in `backend/routes/api.php`

### Fallback STT

If the Wav2Vec2 service fails or exceeds its deadline, the backend uses:

- Model: OpenAI Whisper `tiny.en`
- Service: `scripts/whisper_stt_service.py`
- HTTP service: `http://127.0.0.1:5001/transcribe`

The primary timeout is now 18 seconds and the fallback timeout is 25 seconds. The response and voice-search report include the selected provider and measured processing time.

### Why STT can take time

The browser records audio, uploads it to PHP, PHP forwards it to Python, FFmpeg converts it to mono 16 kHz WAV, and the neural model performs CPU inference. The first request after starting a service may also be slower because the model and runtime are warming up.

## 3. Text-to-speech (TTS) and the woman voice

TTS uses Google Text-to-Speech through the Python `gTTS` package:

- Frontend reader: `frontend/src/pages/library/Reader.jsx`
- Frontend API: `frontend/src/api/tts.js`
- Backend generation: `generate_gtts_audio()` in `backend/routes/api.php`
- Python generator: `scripts/gtts_synthesize.py`

The voice sounds female because gTTS selects Google's default voice for the requested language. This project does not currently send a voice-gender or speaker parameter. gTTS does not provide a dependable male/female selector. A selectable voice would require a provider such as Google Cloud TTS, Azure Speech, Amazon Polly, or a local multi-speaker TTS model.

## 4. Supervised and self-supervised learning

Both concepts are involved, but at different stages:

- The original Wav2Vec2 encoder was pretrained with self-supervised learning on raw speech.
- The published `facebook/wav2vec2-base-960h` checkpoint was then supervised-fine-tuned with labeled LibriSpeech audio and transcripts for CTC speech recognition.
- This project performed additional supervised fine-tuning because each local training row contains an audio path and its correct transcript.
- Whisper is a pretrained fallback used without local fine-tuning in this project.
- gTTS is an external pretrained service used without local training.

## 5. What this project trained

The project did not train a Transformer from scratch.

`scripts/transformer_train_complete.py` loaded pretrained Wav2Vec2 weights and ran a CPU-bounded supervised fine-tuning experiment. The recorded run used `train_mode: "head"`, which froze the Transformer encoder and updated only the CTC projection head.

Evidence is in `models/stt/transformer_metrics.json`:

- Training examples available to that run: 640
- Training examples processed: 120
- Optimizer steps: 120
- Full epochs completed: 0
- Effective epochs: 0.1875
- Trainable parameters: 24,608
- Total parameters: 94,396,320
- Test word accuracy: about 93.20%
- Overall word accuracy across recorded development and test evaluation: about 90.88%

The candidate passed the configured promotion threshold and was copied to `transformer_model/`. The previous checkpoint is preserved in `transformer_model_backup_1781114087/`.

Therefore, the precise statement is: **the project partially fine-tuned the supervised CTC output head; it did not fully fine-tune all Transformer layers and did not train the model from scratch.**

## 6. Speech datasets and locations

The actual local dataset is LibriSpeech:

- Training audio: `speech_datasets/LibriSpeech/train-clean-100/`
- Development audio: `speech_datasets/LibriSpeech/dev-clean/`
- Test audio: `speech_datasets/LibriSpeech/test-clean/`
- Training manifest: `speech_datasets/manifests/train.jsonl`
- Development manifest: `speech_datasets/manifests/dev.jsonl`
- Test manifest: `speech_datasets/manifests/test.jsonl`
- Dataset summary: `speech_datasets/manifests/summary.json`
- Download/preparation evidence: `speech_datasets/download_report.json`
- Validation evidence: `speech_datasets/manifest_validation_report.json`

The manifests contain JSON lines with `audio_filepath`, `text`, `dataset`, and `source_split`. The summary records 28,539 training rows, 2,703 development rows, and 2,620 test rows.

The training script also contains optional Common Voice loading code, but there is no Common Voice manifest in the current workspace. It should not be claimed as a dataset used by the recorded local run.

## 7. How data was loaded and processed

In `scripts/transformer_train_complete.py`:

1. `load_manifest()` reads each JSONL row.
2. Missing audio files and empty transcripts are rejected.
3. Text is uppercased and whitespace is normalized.
4. `ManifestSpeechDataset` loads audio as mono 16 kHz samples.
5. Long audio is clipped to the configured maximum duration.
6. `Wav2Vec2Processor` converts audio into model input values and text into CTC token IDs.
7. `DataCollatorCTC` pads variable-length audio and labels into batches.
8. PyTorch runs forward propagation, CTC loss, backpropagation, and AdamW optimizer steps.
9. Development and test predictions are measured with WER, CER, word accuracy, precision, recall, F1, and sentence exact accuracy.
10. The candidate is promoted only if it passes the configured word-accuracy threshold.

## 8. Frontend, backend, and database connection

### Frontend to backend

React pages call modules in `frontend/src/api/`. All API calls pass through `frontend/src/api/client.js`, which uses:

`http://localhost/digital-library/backend`

The PHP entry point is `backend/index.php`, and request routing is implemented in `backend/routes/api.php`.

Example:

`VoiceSearch.jsx -> api/voiceSearch.js -> api/client.js -> POST /voice-search/search -> backend/routes/api.php`

### Backend to database

PHP obtains a PDO connection through:

- `backend/helpers/Database.php`
- `backend/config/database.php`

Routes execute prepared SQL statements against MySQL. The main schema is `database/database.sql`, and seed records are in `database/seed_data.sql`.

### Database back to frontend

MySQL rows are fetched by PHP, `Response::ok()` serializes them as JSON, `api/client.js` parses the JSON, and React stores/renders the returned `data`.

## 9. User IDs

User IDs are not calculated from a name, email, role, gender, or academic department.

`users.id` is a MySQL `BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY`. MySQL assigns the next internal numeric key when a user row is inserted. Gaps are normal when rows are deleted or transactions fail. The ID is permanent and is used as a foreign key by borrowing, bookmarks, favorites, reading progress, reports, logs, recommendations, and other tables.

Authentication resolves the bearer token to the user ID in `backend/middleware/auth.php`.

## 10. Favorites versus bookmarks

Favorites answer: **Which books do I like or want quick access to?**

- One favorite state per user and book.
- Toggled active/removed.
- No page, section, or note.
- Database table: `favorites`
- Backend routes: `/favorites` and `/favorites/toggle`
- Frontend page: `frontend/src/pages/student/Favorites.jsx`

Bookmarks answer: **Where inside a book do I want to return, and what note belongs there?**

- A user may create multiple bookmark records.
- Stores optional page number, section, and note.
- Database table: `bookmarks`
- Backend routes: `/bookmarks`
- Frontend page: `frontend/src/pages/student/Bookmarks.jsx`

The search page currently creates a general "Book record" bookmark. Reader-level bookmarks can be more precise because the schema supports page and section values.

## 11. Borrowing and whether it is necessary

The borrowing guidance shown in the screenshot is located in:

`frontend/src/pages/library/BookDetails.jsx`

The borrow button calls `frontend/src/api/borrow.js`, which sends `POST /borrow/request`. The backend logic starts in `backend/routes/api.php`, and records are stored in `borrow_requests` and `borrowing_history`.

Borrowing is not technically required for unrestricted electronic books. It is useful only when the institution wants:

- librarian approval;
- licensed or limited digital copies;
- due dates and renewals;
- circulation statistics;
- an auditable access workflow.

This project currently models limited copies with `total_copies` and `available_copies`, so borrowing is actively connected to inventory and reports. It should be retained if those rules are part of the requirements. If every electronic book is permanently available to every authorized user, borrowing can be removed and replaced with direct read/listen access.

## 12. Reports and the meaning of their data

The reports page is `frontend/src/pages/admin/Reports.jsx`. It calls `frontend/src/api/reports.js`, which requests `/reports/{type}` from `backend/routes/api.php`.

The page now supports data preview, CSV export, browser printing, and Save as PDF through the print dialog.

- Book report: catalog identity, total copies, available copies, copies currently in use, status, and creation date.
- Borrowing report: request ID, user ID/name, book ID/title, request/approval/due/renewal/return dates, and status.
- User report: user ID, name, email, role, account status, last login, and creation date.
- Voice-search report: user, transcript, confidence, language, processing time, result count, status, and timestamp.
- TTS report: user, book, text length, provider, status, and timestamp.
- Activity report: actor, role, action, affected entity, result status, and timestamp.

`status` describes the current lifecycle or outcome. IDs are database keys used to join the report row to its original user, book, request, or activity record.

## 13. Access denied and empty lecturer resources

Route permissions are defined in `frontend/src/App.jsx` and enforced again in PHP with `require_role()`.

The access-denied screenshot means the signed-in role tried to open a page assigned to another role. This is expected authorization behavior, not a missing page.

The lecturer "No records yet" state means the backend returned no assigned courses, books, or lecture notes for that lecturer. The relevant endpoint is `/lecturer/resources` in `backend/routes/api.php`. Data appears after `lecturer_courses`, course-book assignments, or lecture-note records exist for that lecturer.
