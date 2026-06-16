import argparse
import json
import re
from pathlib import Path

import numpy as np
import torch
from datasets import load_dataset
from scipy.io.wavfile import write as write_wav
from transformers import SpeechT5ForTextToSpeech, SpeechT5HifiGan, SpeechT5Processor


MODEL_ID = "microsoft/speecht5_tts"
VOCODER_ID = "microsoft/speecht5_hifigan"
SPEAKER_DATASET_ID = "Matthijs/cmu-arctic-xvectors"
MAX_CHARS = 450


def chunk_text(text: str) -> list[str]:
    sentences = re.split(r"(?<=[.!?])\s+", text)
    chunks: list[str] = []
    current = ""
    for sentence in sentences:
        sentence = sentence.strip()
        if not sentence:
            continue
        if len(sentence) > MAX_CHARS:
            parts = [sentence[i:i + MAX_CHARS] for i in range(0, len(sentence), MAX_CHARS)]
        else:
            parts = [sentence]
        for part in parts:
            candidate = f"{current} {part}".strip()
            if len(candidate) <= MAX_CHARS:
                current = candidate
            else:
                if current:
                    chunks.append(current)
                current = part
    if current:
        chunks.append(current)
    return chunks


def load_speaker_embedding() -> torch.Tensor:
    # SpeechT5 needs a 512-dimensional speaker embedding. Use the common CMU
    # Arctic x-vector example voice when available, with a neutral fallback so
    # narration still works offline after code checkout.
    try:
        embeddings = load_dataset(SPEAKER_DATASET_ID, split="validation")
        vector = np.asarray(embeddings[7306]["xvector"], dtype=np.float32)
    except Exception:
        vector = np.zeros(512, dtype=np.float32)
        vector[0] = 1.0
    return torch.tensor(vector).unsqueeze(0)


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate a WAV narration with Microsoft SpeechT5.")
    parser.add_argument("input_file")
    parser.add_argument("output_file")
    parser.add_argument("--lang", default="en")
    args = parser.parse_args()

    if args.lang != "en":
        print(json.dumps({"success": False, "error": "SpeechT5 narration is currently configured for English only"}))
        return 2

    source = Path(args.input_file)
    target = Path(args.output_file)
    text = source.read_text(encoding="utf-8").strip()
    if not text:
        print(json.dumps({"success": False, "error": "Narration text is empty"}))
        return 2

    try:
        processor = SpeechT5Processor.from_pretrained(MODEL_ID)
        model = SpeechT5ForTextToSpeech.from_pretrained(MODEL_ID)
        vocoder = SpeechT5HifiGan.from_pretrained(VOCODER_ID)
        speaker_embeddings = load_speaker_embedding()

        waveforms = []
        silence = np.zeros(2400, dtype=np.float32)
        for chunk in chunk_text(text):
            inputs = processor(text=chunk, return_tensors="pt")
            with torch.no_grad():
                speech = model.generate_speech(inputs["input_ids"], speaker_embeddings, vocoder=vocoder)
            waveforms.append(speech.cpu().numpy().astype(np.float32))
            waveforms.append(silence)

        if not waveforms:
            print(json.dumps({"success": False, "error": "No valid narration chunks were generated"}))
            return 2

        audio = np.concatenate(waveforms)
        audio = np.clip(audio, -1.0, 1.0)
        pcm = (audio * 32767).astype(np.int16)

        target.parent.mkdir(parents=True, exist_ok=True)
        write_wav(str(target), 16000, pcm)
    except Exception as exc:
        print(json.dumps({"success": False, "error": str(exc)}))
        return 1

    print(json.dumps({
        "success": True,
        "output": str(target),
        "bytes": target.stat().st_size,
        "provider": "speecht5",
        "model": MODEL_ID,
    }))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
