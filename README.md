# INES Intelligent Digital Library

The active system is an English digital-library application built with:

- React 18 and Vite in `frontend/`;
- PHP 8.2 on XAMPP in `backend/`;
- MySQL database `ines_intelligent_library`;
- internal Python AI services for Transformer STT, Whisper fallback, gTTS, and document conversion;
- real LibriSpeech audio for speech-to-text evaluation.

## Project structure

```text
frontend/             Active React application and public assets
backend/              Public authenticated PHP API, Python gateway, uploads
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

1. Start Apache and MySQL in XAMPP.
2. Run `START_SYSTEM.bat`, or run:

```powershell
npm run dev
npm run start:ai
```

Application: `http://127.0.0.1:3000`

PHP API: `http://localhost/digital-library/backend`

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

The current connected Transformer service uses pretrained
`facebook/wav2vec2-base-960h` weights unless a valid local
`transformer_model/` checkpoint exists. Its local held-out LibriSpeech smoke
evaluation is tracked in `models/stt/transformer_metrics.json`: 95.16% word
accuracy and 75.00% exact-sentence accuracy on 40 real dev/test clips.

See `docs/PROJECT_LOGIC_AND_STT_METHODOLOGY_2026-06-09.md`.
