# INES Intelligent Digital Library

The active system is an English digital-library application built with:

- React 18 and Vite 8 in `frontend/`;
- PHP 8.2 on XAMPP in `backend/`;
- MySQL database `ines_intelligent_library`;
- internal Python AI services for Transformer STT, Whisper fallback, gTTS, and document conversion;
- real LibriSpeech audio for speech-to-text evaluation.

## Project structure

```text
frontend/             Active React application and public assets
backend/              Public authenticated PHP API, configuration, and uploads
database/             Schema, seed data, migrations notes, and SQL queries
scripts/              Service, training, acceptance, backup, and restore commands
speech_datasets/      Real LibriSpeech audio, manifests, and feature caches
models/stt/           Verified model metric reports
data/                 Library-specific English speech-search phrases
docs/                 Architecture, methodology, and audit documentation
logs/                 Runtime and per-epoch logs
```

Legacy Node APIs, duplicate frontends, Kinyarwanda/translation resources,
synthetic training pipelines, obsolete deployment experiments, and redundant
test folders have been removed.

## Start

Run the complete development system with:

```powershell
npm run dev
```

Prerequisites: XAMPP installed at `C:\xampp`, Node.js 20.19 or newer, and the
project Python 3.11 environment with `backend/requirements.txt` installed.

This starts Apache and MySQL when needed, starts the Wav2Vec2 and Whisper
speech services, verifies the PHP backend, and keeps Vite in the foreground.
Use `npm run dev:frontend` only when the supporting services are already
running.

Application: `http://127.0.0.1:3000`

PHP API: `http://localhost/digital-library/backend`

## Desktop React app

Build and run the Electron desktop application with:

```powershell
npm.cmd run desktop
```

Create the distributable Windows app folder with:

```powershell
npm.cmd run desktop:package
```

The desktop shell serves the same React build and connects to the same PHP,
MySQL, upload, reader, narration, and speech-to-text services.

## Verification

```powershell
npm run build
npm run test:live
powershell -ExecutionPolicy Bypass -File scripts/check_system.ps1
```

The live acceptance suite requires `INES_ADMIN_PASSWORD` in the current shell.

## Speech-to-text policy

Catalog microphone audio follows this order:

1. Wav2Vec2 Transformer CTC service on port `5006`;
2. Whisper `tiny.en` fallback on port `5001` if the Transformer service is unavailable or cannot decode the recording.

The current connected Transformer service loads the local
`transformer_model/` checkpoint. That checkpoint was fine-tuned from pretrained
`facebook/wav2vec2-base-960h` weights on real LibriSpeech manifest samples.
The latest CPU-bounded evaluation is tracked in
`models/stt/transformer_metrics.json`: 90.88% aggregate word accuracy and
58.33% exact-sentence accuracy across 40 dev-clean and 60 test-clean clips.

See `docs/SYSTEM_FEATURES_AI_AND_DATA_GUIDE.md`.
