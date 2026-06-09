# Claude Assistance Tasks

Claude is not directly callable from this Codex environment. These tasks can
be assigned in a separate Claude session without allowing it to alter the live
training process.

1. Read `training_logs/wav2vec2_lstm_four_day.out.log` and summarize cache or
   epoch progress every two hours.
2. Check `training_logs/wav2vec2_lstm_four_day.err.log` for tracebacks.
3. Validate that train, dev, and test manifest audio paths are disjoint.
4. Review per-epoch examples for repeated deletion, insertion, and proper-name
   errors.
5. Do not delete caches, stop processes, change checkpoints, or start a second
   training process.
6. Report suggested changes only; Codex should review them before application.

The authoritative monitor command is:

```powershell
npm run train:stt:status
```
