# INES Intelligent Digital Library

The active system is an English digital-library application built with:

- React 18 and Vite in `frontend/`;
- PHP 8.2 on XAMPP in `backend/`;
- MySQL database `ines_intelligent_library`;
- internal Python AI services for STT, gTTS, document conversion, and training;
- real LibriSpeech and Google Speech Commands audio for model evaluation.

## Project structure

```text
frontend/             Active React application and public assets
backend/              Public authenticated PHP API, Python gateway, uploads
database/             Schema, seed data, migrations notes, and SQL queries
scripts/              Service, training, acceptance, backup, and restore commands
ml/                   Shared ML metrics and dataset/evaluation tools
ml-speech/models/     Current trained checkpoints
speech_datasets/      Real LibriSpeech audio, manifests, and feature caches
models/stt/           Verified model metric reports
data/                 Library-specific English speech-search phrases
docs/                 Architecture, methodology, and audit documentation
logs/                 Runtime and per-epoch logs
training_logs/        Long-running training session output
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
npm run train:stt:status
powershell -ExecutionPolicy Bypass -File scripts/check_system.ps1
```

The live acceptance suite requires `INES_ADMIN_PASSWORD` in the current shell.

## Speech-to-text policy

Catalog microphone audio follows this order:

1. trained Wav2Vec2 residual BiLSTM adapter, once its real held-out metrics pass;
2. experimental MFCC BiLSTM-CTC attempt for research comparison;
3. Whisper `tiny.en` automatic fallback for the user-visible transcription.

The production gate is at least 80% word accuracy and 50% exact-sentence
accuracy on untouched real LibriSpeech dev/test audio. The system does not
switch based on training loss or a single successful recording.

See `docs/PROJECT_LOGIC_AND_STT_METHODOLOGY_2026-06-09.md`.
