# Transformer STT Supervisor Explanation

Updated: 2026-06-10

## Short answer

Yes, the project can be described as supervised learning with a self-attention
Transformer speech-to-text model using pretrained Wav2Vec2 weights.

The honest wording is:

> The system uses a Wav2Vec2 Transformer CTC speech-to-text model initialized
> from pretrained `facebook/wav2vec2-base-960h` weights, then fine-tuned on
> labeled LibriSpeech audio-transcript pairs. It is supervised learning because
> every training sample has an input audio signal and a target human transcript.

## Why it is supervised learning

Each dataset row contains:

- input `x`: a real English speech audio file;
- label `y`: the correct English transcript.

Example:

```json
{
  "audio_filepath": "speech_datasets/LibriSpeech/.../1089-134686-0000.flac",
  "text": "HE HOPED THERE WOULD BE STEW FOR DINNER ..."
}
```

The model predicts a token sequence from the audio, compares it with the
transcript label, computes CTC loss, and updates weights by backpropagation.

## Model algorithm

Algorithm name:

`Wav2Vec2 Transformer Encoder + CTC Classification Head`

High-level steps:

1. Load real audio at 16 kHz.
2. Convert raw waveform into latent speech features.
3. Pass the features through Transformer encoder layers.
4. Use self-attention so each time step can attend to other relevant time steps.
5. Project hidden states to vocabulary-token logits.
6. Train using Connectionist Temporal Classification loss.
7. Decode predictions with CTC argmax decoding.

## Self-attention mechanism

For each hidden audio feature, the Transformer creates:

- query vector `Q`;
- key vector `K`;
- value vector `V`.

Attention is computed as:

```text
Attention(Q, K, V) = softmax((QK^T) / sqrt(d_k)) V
```

Meaning:

- `QK^T` measures how strongly one audio time step relates to another;
- `softmax` converts scores into attention weights;
- multiplying by `V` creates a context-aware representation.

This helps the model understand speech sounds using surrounding context, not
only one isolated frame.

## Tokenisation and labels

The model does not classify whole words directly. It uses a CTC tokenizer with
a small vocabulary of characters/subword symbols. During training:

1. transcript text is normalized to uppercase;
2. text is tokenized into IDs;
3. audio is converted into input values;
4. the model predicts token IDs at many time steps;
5. CTC collapses repeated tokens and removes blank tokens.

Example:

```text
Transcript: "BOOKS"
Token IDs:  B O O K S
Raw CTC output: _ B B _ O O _ K S _
Decoded text: "BOOKS"
```

The blank token `_` allows the model to align audio frames with text labels even
when we do not manually label exact start/end time for every character.

## Pretrained weights

The base model is:

```text
facebook/wav2vec2-base-960h
```

Those weights were pretrained before this project. The project uses transfer
learning: it starts from those pretrained weights and fine-tunes on real
LibriSpeech samples for the library speech-search task.

This is stronger and more realistic than training from scratch on a small CPU
machine.

## Can we train from scratch in one day?

Technically yes, but not to a strong production accuracy on this machine.

Training Wav2Vec2 from scratch needs:

- very large speech datasets;
- many hours or days of GPU training;
- careful hyperparameter tuning;
- much more compute than this local CPU setup.

For a one-day project timeline, transfer learning from pretrained Wav2Vec2
weights is the correct engineering choice.

## Current training result

Latest local run:

- base weights: `facebook/wav2vec2-base-960h`;
- local checkpoint: `transformer_model/`;
- dataset: real LibriSpeech manifests;
- training subset: 48 real train-clean-100 samples;
- optimizer steps: 8;
- training mode: encoder frozen, CTC head trainable;
- dev samples: 12;
- test samples: 20.

Current metrics:

- aggregate word accuracy: 89.32%;
- aggregate exact sentence accuracy: 50.83%;
- aggregate WER: 10.68%;
- test word accuracy: 94.25%;
- dev word accuracy: 84.39%.

## Metrics to explain

Primary STT metrics:

- Word Error Rate: `(Substitutions + Insertions + Deletions) / Reference Words`.
- Word Accuracy: `(1 - WER) * 100`.
- Character Error Rate: character-level version of WER.
- Sentence Exact Accuracy: fully correct sentences divided by all sentences.
- Word Precision: correct predicted words divided by all predicted words.
- Word Recall: correct predicted words divided by all reference words.
- Word F1: harmonic mean of precision and recall.

Formula:

```text
F1 = 2 * (Precision * Recall) / (Precision + Recall)
```

## About ROC-AUC

ROC-AUC is useful for binary or multi-class classification where each example
has class probabilities. Open-vocabulary speech-to-text is sequence generation,
so ROC-AUC is not the normal main metric.

If the supervisor asks for ROC-AUC, the technically correct answer is:

> ROC-AUC is not the primary evaluation metric for CTC-based open-vocabulary
> speech-to-text. The project reports WER, CER, word accuracy, sentence exact
> accuracy, and word-level F1. ROC-AUC could only be added by reformulating the
> problem as token-level one-vs-rest classification, but that would not measure
> final transcription quality as directly as WER/CER.

## Frontend and backend connection

```text
React microphone
-> PHP /voice-search/search
-> Python Transformer STT service on port 5006
-> Wav2Vec2 Transformer CTC model in transformer_model/
-> transcription returned to PHP
-> PHP searches books and logs voice_search_logs
-> React displays search results
```

React does not call the model directly. The authenticated PHP backend controls
permissions, logging, and fallback behavior.
