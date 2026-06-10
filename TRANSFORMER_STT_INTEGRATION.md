# Transformer STT Integration

Updated: 2026-06-10

The active English speech-to-text path is:

`React microphone -> PHP /voice-search/search -> Wav2Vec2 Transformer CTC :5006 -> Whisper :5001 fallback`

## Running services

```powershell
npm run start:ai
```

This starts:

- Whisper fallback: `scripts/whisper_stt_service.py` on port `5001`;
- Python AI gateway: `backend/python/main.py` on port `5003`;
- Transformer STT: `scripts/transformer_speech_service.py` on port `5006`.

Ports `5004` and `5005` were used by retired LSTM experiments and are no longer
part of the active system.

## Active model

`scripts/transformer_speech_service.py` loads:

1. `transformer_model/` if it contains a valid Hugging Face `config.json`;
2. `transformer_librispeech_model/` if it contains a valid `config.json`;
3. otherwise `facebook/wav2vec2-base-960h`.

At the time of this update, the connected production service uses the local
`transformer_model/` checkpoint. It was initialized from pretrained
`facebook/wav2vec2-base-960h` Wav2Vec2 Transformer CTC weights and fine-tuned
with a CPU-bounded real LibriSpeech run.

## Verified baseline

Current metric report: `models/stt/transformer_metrics.json`.

- Dataset: real LibriSpeech local manifest audio.
- Training: 48 `train-clean-100` samples, 8 optimizer steps, head-only tuning.
- Evaluation: 12 `dev-clean` samples and 20 `test-clean` samples.
- Aggregate word accuracy: 89.32%.
- Aggregate exact sentence accuracy: 50.83%.
- Aggregate WER: 10.68%.

The retired Wav2Vec2 + BiLSTM adapter score is not used by the app anymore.

## API endpoints

Transformer:

```text
GET  http://127.0.0.1:5006/health
POST http://127.0.0.1:5006/api/stt/transcribe
POST http://127.0.0.1:5006/transcribe
```

PHP public route:

```text
POST http://localhost/digital-library/backend/voice-search/search
```

React calls only the PHP route.

## Future fine-tuning

Fine-tuning should use `scripts/transformer_train_complete.py`, the real
LibriSpeech manifests under `speech_datasets/manifests/`, CTC loss, and untouched
dev/test evaluation. When complete, save the checkpoint to `transformer_model/`
and update `models/stt/transformer_metrics.json`.
