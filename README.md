# INES Intelligent Digital Library

The active system is an English digital-library application built with:

- React 18 and Vite 8 in `frontend/`;
- PHP 8.2 on XAMPP in `backend/`;
- MySQL database `ines_intelligent_library`;
- internal Python AI services for Transformer STT, Whisper fallback, SpeechT5/gTTS narration, and document conversion;
- real LibriSpeech audio for speech-to-text evaluation.

## Project structure

```text
frontend/             Active React application and public assets
backend/              Public authenticated PHP API, configuration, and uploads
database/             Schema, seed data, and SQL query/migration files
scripts/              Service, training, acceptance, backup, and restore commands
speech_datasets/      Real LibriSpeech audio, manifests, and feature caches
models/stt/           Verified model metric reports
data/                 Library-specific English speech-search phrases
docs/                 Word defense document and related final artifacts
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
`transformer_model/` checkpoint. The recorded local run continued from the
local Wav2Vec2-CTC checkpoint and partially fine-tuned the CTC output head on
real LibriSpeech manifest samples.
The latest CPU-bounded evaluation is tracked in
`models/stt/transformer_metrics.json`: 90.88% aggregate word accuracy and
58.33% exact-sentence accuracy across 40 dev-clean and 60 test-clean clips.

## Text-to-speech policy

Book narration follows this order:

1. Microsoft SpeechT5 Transformer TTS through the persistent local service in `scripts/speecht5_tts_service.py` on port `5007`;
2. Microsoft SpeechT5 CLI synthesis through `scripts/speecht5_synthesize.py` if the service is unavailable;
3. Google gTTS through `scripts/gtts_synthesize.py` if the local model cannot generate audio.

SpeechT5 produces local WAV narration, while gTTS produces MP3 fallback audio.
This keeps the defended system Transformer-based for voice input and audio
reading, while preserving a reliable fallback for demonstrations.
Local startup starts the SpeechT5 service so the model stays loaded in memory,
then verifies readiness through backend `/health` under `data.tts`. The older
preload file `tmp/speecht5-preload.wav` remains as a readiness artifact and
fallback check.

For defense preparation and the answers to the project questions, see
`docs/INES_Digital_Library_Defense_QA.docx`.

## Demo accounts

| Role | Email | Password |
|---|---|---|
| Librarian/Admin | `library@gmail.com` | `12345678` |
| Lecturer | `lecturer@gmail.com` | `12345678` |

These are local demonstration accounts only. Change the passwords before any
real deployment.
