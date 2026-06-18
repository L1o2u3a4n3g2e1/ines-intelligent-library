# Project Structure

Updated: 2026-06-16

```text
C:/xampp/htdocs/digital-library/
|-- frontend/          React 18 + Vite web application
|-- backend/           PHP API, configuration, auth, uploads, and routes
|-- database/          MySQL schema, seed data, SQL queries, migrations
|-- scripts/           AI services, SpeechT5/gTTS, document pipeline, checks, tests
|-- models/stt/        Current STT metric reports
|-- speech_datasets/   LibriSpeech manifests and local real audio cache
|-- book_imports/      Legal book metadata, downloader, importer, docs
|-- docs/              Word defense document and related final artifacts
|-- data/              Library-specific English voice-search phrases
|-- logs/              Runtime logs, ignored by Git
`-- dist/              Vite production build output, ignored by Git
```

## Frontend

`frontend/index.html` is the Vite entry HTML file. It defines the root
`<div id="root"></div>` and loads `frontend/src/main.jsx`, where React mounts
the application.

`frontend/src/api/` contains HTTP clients. `frontend/src/pages/` contains role
dashboards, catalog search, readers, and admin tools. Microphone search is wired
from dashboard/global search and catalog search to the PHP backend.

## Backend

`backend/routes/api.php` contains the main application routes. It handles auth,
roles, prepared SQL, book upload/import behavior, voice search, narration,
tracking logs, and reports.

The PHP API calls the local Wav2Vec2 and Whisper services directly. React only
communicates with the authenticated PHP routes.

## AI Services

- `scripts/transformer_speech_service.py`: Wav2Vec2 Transformer CTC STT on port `5006`.
- `scripts/whisper_stt_service.py`: Whisper `tiny.en` fallback on port `5001`.
- `scripts/speecht5_tts_service.py`: persistent SpeechT5 TTS service on port `5007`.
- `scripts/speecht5_synthesize.py`: local Microsoft SpeechT5 Transformer WAV narration.
- `scripts/gtts_synthesize.py`: English MP3 narration with Google gTTS.
- `scripts/transformer_train_complete.py`: retained path for future Transformer fine-tuning.

## QA Scripts

`scripts/live_system_acceptance.mjs` is a Node.js live acceptance test. It is
not part of the application UI. It logs in, calls the PHP API, uploads test
files, checks borrowing, reports, STT, TTS, password reset, and writes a QA
result file under `tmp/`.

## Database

The MySQL schema is in `database/database.sql`; seed data is in
`database/seed_data.sql`; query examples are in `database/queries/`.

## Books

Imported and uploaded catalog files are stored under `backend/uploads/books/`.
Private user books are stored under `backend/uploads/personal_books/`.
Downloaded import source files under `book_imports/books/` are ignored by Git.

## Removed Desktop App

The desktop shell was removed because the defended system is now the web
application started with `npm run dev`.
