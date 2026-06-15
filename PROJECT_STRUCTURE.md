# Project Structure

Updated: 2026-06-10

```text
C:/xampp/htdocs/digital-library/
├── frontend/                 React 18 + Vite app
├── backend/                  PHP API, configs, uploads
├── database/                 MySQL schema, seed data, migration notes, SQL queries
├── scripts/                  AI services, gTTS, document pipeline, checks, tests
├── models/stt/               Current STT metric reports
├── speech_datasets/          LibriSpeech manifests and local real audio cache
├── book_imports/             Legal book metadata, downloader, importer, docs
├── docs/                     Architecture and methodology documentation
├── data/                     Library-specific English voice-search phrases
└── logs/                     Runtime logs, ignored by Git
```

## Frontend

`frontend/src/api/` contains HTTP clients. `frontend/src/pages/` contains role
dashboards, catalog search, readers, and admin tools. Microphone search is wired
from the dashboard/global search and catalog search to the PHP backend.

## Backend

`backend/routes/api.php` contains the main application routes. It handles auth,
roles, prepared SQL, book upload/import behavior, voice search, gTTS narration,
tracking logs, and reports.

The PHP API calls the local Wav2Vec2 and Whisper services directly. React only
communicates with the authenticated PHP routes.

## AI services

- `scripts/transformer_speech_service.py`: Wav2Vec2 Transformer CTC STT on port `5006`.
- `scripts/whisper_stt_service.py`: Whisper `tiny.en` fallback on port `5001`.
- `scripts/gtts_synthesize.py`: English MP3 narration with Google gTTS.
- `scripts/transformer_train_complete.py`: retained path for future Transformer fine-tuning.

Retired RNN/LSTM scripts and checkpoints were removed.

## Database

The MySQL schema is in `database/database.sql`; seed data is in
`database/seed_data.sql`; query examples are in `database/queries/`.

## Books

Imported and uploaded catalog files are stored under `backend/uploads/books/`.
Private user books are stored under `backend/uploads/personal_books/`.
Downloaded import source files under `book_imports/books/` are ignored by Git.
