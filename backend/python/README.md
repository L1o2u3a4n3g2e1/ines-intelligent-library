# INES Python Backend

This internal FastAPI service formalizes Python's backend role.

## Responsibilities

- route open-vocabulary audio to Whisper on port 5001;
- test the open-vocabulary LSTM candidates before using Whisper as fallback;
- expose model and LSTM-training status to the PHP backend;
- keep ML services isolated from the public React client.

## Boundary

React does not call this service directly. The request flow is:

`React -> authenticated PHP API -> Python AI gateway -> model service`

PHP remains responsible for users, roles, prepared SQL, MySQL transactions, book permissions, and activity logging.

Run all AI services with:

```powershell
npm run start:ai
```
