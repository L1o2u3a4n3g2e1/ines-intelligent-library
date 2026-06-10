# INES Python Backend

This internal FastAPI service formalizes Python's backend role.

## Responsibilities

- route open-vocabulary audio to the Wav2Vec2 Transformer CTC service on port 5006;
- use Whisper `tiny.en` on port 5001 as the final fallback;
- expose AI model health to the PHP backend;
- keep ML services isolated from the public React client.

## Boundary

React does not call this service directly. The request flow is:

`React -> authenticated PHP API -> Python AI gateway -> model service`

PHP remains responsible for users, roles, prepared SQL, MySQL transactions, book permissions, and activity logging.

Run all AI services with:

```powershell
npm run start:ai
```
