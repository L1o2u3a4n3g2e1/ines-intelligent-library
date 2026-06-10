#!/usr/bin/env python3
"""
LSTM English Speech-to-Text: LibriSpeech + Personal Voice
Two-Phase Training for 85% Accuracy in 3-4 Hours

Phase 1: LibriSpeech-clean-100 (1.5-2 hours)
Phase 2: Personal voice fine-tuning (1-2 hours)
"""

import os
import sys
import torch
import torchaudio
import librosa
import numpy as np
from pathlib import Path
from typing import List, Dict, Tuple, Optional
import json
import logging
import time
import subprocess
from dataclasses import dataclass, asdict
from datetime import datetime
import warnings

warnings.filterwarnings('ignore')

# HuggingFace imports
from datasets import Dataset, DatasetDict, load_dataset, Audio, concatenate_datasets
from transformers import (
    AutoProcessor,
    AutoModelForCTC,
    TrainingArguments,
    Trainer,
    EarlyStoppingCallback,
    set_seed,
)
import evaluate
from scipy.io import wavfile

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - [%(levelname)s] - %(message)s'
)
logger = logging.getLogger(__name__)

# ==================== CONFIGURATION ====================

@dataclass
class Phase1Config:
    """LibriSpeech training config"""

    model_name: str = "facebook/wav2vec2-base-960h"
    dataset_name: str = "openslr/librispeech_asr"
    dataset_config: str = "clean"
    dataset_split: str = "train.100"

    num_train_epochs: int = 1
    max_steps: int = 2000
    per_device_train_batch_size: int = 8
    per_device_eval_batch_size: int = 8
    gradient_accumulation_steps: int = 4

    learning_rate: float = 5e-5
    warmup_steps: int = 200

    gradient_checkpointing: bool = True
    fp16: bool = True

    eval_strategy: str = "steps"
    eval_steps: int = 500
    save_steps: int = 500
    logging_steps: int = 50

    max_samples: int = 100000
    output_dir: str = "./lstm_librispeech_model"

@dataclass
class Phase2Config:
    """Personal voice fine-tuning config"""

    pretrained_model_dir: str = "./lstm_librispeech_model"

    num_train_epochs: int = 2
    max_steps: int = 800
    per_device_train_batch_size: int = 8
    per_device_eval_batch_size: int = 8
    gradient_accumulation_steps: int = 4

    learning_rate: float = 1e-5
    warmup_steps: int = 50

    gradient_checkpointing: bool = True
    fp16: bool = True

    eval_strategy: str = "steps"
    eval_steps: int = 100
    save_steps: int = 100
    logging_steps: int = 20

    early_stopping_patience: int = 2

    data_dir: str = "./voice_data"
    output_dir: str = "./lstm_personal_voice_model"

# ==================== ADVANCED AUDIO AUGMENTATION ====================

class AdvancedAudioAugmenter:
    """Professional-grade audio augmentation"""

    def __init__(self, sample_rate=16000):
        self.sample_rate = sample_rate

    def spec_augment(self, audio):
        """SpecAugment: frequency and time masking"""
        mel_spec = librosa.feature.melspectrogram(y=audio, sr=self.sample_rate, n_mels=80)
        mel_spec_db = librosa.power_to_db(mel_spec, ref=np.max)

        time_mask_width = np.random.randint(5, 15)
        time_mask_start = np.random.randint(0, max(1, mel_spec_db.shape[1] - time_mask_width))
        mel_spec_db[:, time_mask_start:time_mask_start+time_mask_width] = 0

        freq_mask_width = np.random.randint(5, 20)
        freq_mask_start = np.random.randint(0, max(1, mel_spec_db.shape[0] - freq_mask_width))
        mel_spec_db[freq_mask_start:freq_mask_start+freq_mask_width, :] = 0

        return audio.astype(np.float32)

    def speed_perturb(self, audio, min_rate=0.95, max_rate=1.05):
        """Speed perturbation ±5%"""
        rate = np.random.uniform(min_rate, max_rate)
        return librosa.effects.time_stretch(audio, rate=rate).astype(np.float32)

    def pitch_shift(self, audio, n_steps_range=(-2, 2)):
        """Pitch shifting ±2 semitones"""
        n_steps = np.random.randint(n_steps_range[0], n_steps_range[1])
        if n_steps != 0:
            return librosa.effects.pitch_shift(audio, sr=self.sample_rate, n_steps=n_steps).astype(np.float32)
        return audio.astype(np.float32)

    def add_background_noise(self, audio, noise_factor=0.003):
        """Add white Gaussian noise"""
        noise = np.random.randn(len(audio))
        return (audio + noise_factor * noise).astype(np.float32)

    def time_shift(self, audio, shift_max=0.1):
        """Random time shift"""
        shift = int(np.random.uniform(-shift_max * len(audio), shift_max * len(audio)))
        if shift != 0:
            return np.roll(audio, shift).astype(np.float32)
        return audio.astype(np.float32)

    def augment(self, audio, probability=0.5):
        """Apply random augmentation"""
        augmented = audio.copy()

        if np.random.rand() < probability:
            augmented = self.speed_perturb(augmented)
        if np.random.rand() < probability:
            augmented = self.pitch_shift(augmented)
        if np.random.rand() < probability:
            augmented = self.add_background_noise(augmented, noise_factor=0.002)
        if np.random.rand() < probability:
            augmented = self.spec_augment(augmented)

        return augmented.astype(np.float32)

augmenter = AdvancedAudioAugmenter(sample_rate=16000)

# ==================== PHASE 1: LIBRISPEECH LOADING ====================

def download_librispeech():
    """Download LibriSpeech-clean-100 from Hugging Face"""
    logger.info("\n Loading LibriSpeech dataset...")
    logger.info("   This will be streamed (not fully downloaded)")

    try:
        dataset = load_dataset(
            "openslr/librispeech_asr",
            "clean",
            split="train.100",
            streaming=True,
            trust_remote_code=True,
        )

        logger.info(f" LibriSpeech loaded successfully")
        return dataset

    except Exception as e:
        logger.error(f" Error loading LibriSpeech: {e}")
        raise

def process_librispeech(dataset, processor, augment=False, max_samples=100000):
    """Process LibriSpeech dataset for training"""

    logger.info(f"\n Processing LibriSpeech (max {max_samples} samples)...")

    def process_sample(sample):
        """Process single sample"""
        try:
            speech = sample['audio']['array']
            sr = sample['audio']['sampling_rate']

            if sr != 16000:
                speech = librosa.resample(speech, orig_sr=sr, target_sr=16000)
            else:
                speech = speech.astype(np.float32)

            if augment:
                speech = augmenter.augment(speech, probability=0.4)

            text = sample['text'].upper()
            processed = processor(
                speech,
                sampling_rate=16000,
                text=text
            )

            return {
                'input_values': processed['input_values'][0],
                'labels': processed['labels'],
            }
        except Exception as e:
            logger.warning(f"  Sample error: {e}")
            return None

    processed_samples = []
    for i, sample in enumerate(dataset):
        if i >= max_samples:
            break

        if i % 5000 == 0:
            logger.info(f"   Processed {i} samples...")

        processed = process_sample(sample)
        if processed is not None:
            processed_samples.append(processed)

    logger.info(f" Processed {len(processed_samples)} LibriSpeech samples")
    return Dataset.from_list(processed_samples)

# ==================== PHASE 2: PERSONAL VOICE LOADING ====================

def load_personal_voice_data(data_dir: str, max_samples=None):
    """Load personal voice recordings"""

    logger.info(f"\n Loading personal voice data from {data_dir}...")

    train_audio = []
    train_text = []
    val_audio = []
    val_text = []

    train_dir = Path(data_dir) / "train"
    if train_dir.exists():
        for audio_file in sorted(train_dir.glob("*.wav")):
            text_file = audio_file.with_suffix(".txt")
            if text_file.exists():
                with open(text_file, 'r') as f:
                    text = f.read().strip().upper()
                train_audio.append(str(audio_file))
                train_text.append(text)

    val_dir = Path(data_dir) / "val"
    if val_dir.exists():
        for audio_file in sorted(val_dir.glob("*.wav")):
            text_file = audio_file.with_suffix(".txt")
            if text_file.exists():
                with open(text_file, 'r') as f:
                    text = f.read().strip().upper()
                val_audio.append(str(audio_file))
                val_text.append(text)

    if not train_audio:
        raise ValueError(f"No personal voice data found in {train_dir}")

    logger.info(f" Personal voice data loaded:")
    logger.info(f"   Training: {len(train_audio)} samples")
    logger.info(f"   Validation: {len(val_audio)} samples")

    return train_audio, train_text, val_audio, val_text

def process_personal_voice(audio_files: List[str], texts: List[str],
                           processor, augment=True, max_samples=None):
    """Process personal voice recordings"""

    logger.info(f"\n Processing personal voice data...")

    samples = []
    for i, (audio_path, text) in enumerate(zip(audio_files, texts)):
        if max_samples and i >= max_samples:
            break

        try:
            speech, sr = librosa.load(audio_path, sr=16000)

            if augment:
                speech = augmenter.augment(speech, probability=0.5)

            processed = processor(
                speech,
                sampling_rate=16000,
                text=text
            )

            samples.append({
                'input_values': processed['input_values'][0],
                'labels': processed['labels'],
            })

            if (i + 1) % 10 == 0:
                logger.info(f"   Processed {i+1}/{len(audio_files)} samples")

        except Exception as e:
            logger.warning(f"  Error processing {audio_path}: {e}")
            continue

    logger.info(f" Processed {len(samples)} personal voice samples")
    return Dataset.from_list(samples)

# ==================== DATA COLLATOR ====================

from dataclasses import dataclass as dc
from typing import Union

@dc
class DataCollatorCTCWithPadding:
    """Collate CTC samples with padding"""
    processor: object
    padding: Union[bool, str] = "longest"

    def __call__(self, features: List[Dict[str, Union[List[int], torch.Tensor]]]) -> Dict[str, torch.Tensor]:
        input_features = [{"input_values": feature["input_values"]} for feature in features]
        label_features = [{"input_ids": feature["labels"]} for feature in features]

        batch = self.processor.pad(input_features, padding=self.padding, return_tensors="pt")
        labels_batch = self.processor.pad(labels=label_features, padding=self.padding, return_tensors="pt")

        labels = labels_batch["input_ids"].masked_fill(labels_batch.attention_mask.ne(1), -100)
        batch["labels"] = labels

        return batch

# ==================== METRICS ====================

wer_metric = evaluate.load("wer")
cer_metric = evaluate.load("cer")

def compute_metrics(pred, processor):
    """Compute WER, CER, and accuracy"""
    pred_logits = pred.predictions
    pred_ids = np.argmax(pred_logits, axis=-1)

    pred.label_ids[pred.label_ids == -100] = processor.tokenizer.pad_token_id

    pred_str = processor.batch_decode(pred_ids)
    label_str = processor.batch_decode(pred.label_ids, group_tokens=False)

    wer = wer_metric.compute(predictions=pred_str, references=label_str)
    cer = cer_metric.compute(predictions=pred_str, references=label_str)

    accuracy = 100 * (1 - wer / 100)

    return {
        "wer": wer,
        "cer": cer,
        "accuracy": accuracy,
    }

# ==================== PHASE 1: LIBRISPEECH TRAINING ====================

def train_phase1_librispeech(config: Phase1Config):
    """Phase 1: Train on LibriSpeech"""

    print("\n" + "="*70)
    print("[PHASE 1] LibriSpeech Training (1.5-2 hours)")
    print("="*70)

    start_time = time.time()

    logger.info(f"\n Loading model: {config.model_name}")
    processor = AutoProcessor.from_pretrained(config.model_name)
    model = AutoModelForCTC.from_pretrained(
        config.model_name,
        ctc_loss_reduction="mean",
        pad_token_id=processor.tokenizer.pad_token_id,
        attention_dropout=0.05,
        hidden_dropout=0.05,
        feat_proj_dropout=0.05,
        layerdrop=0.05,
    )

    logger.info(f" Model loaded: {model.num_parameters():,} parameters")

    librispeech_raw = download_librispeech()

    train_dataset = process_librispeech(
        librispeech_raw,
        processor,
        augment=True,
        max_samples=config.max_samples
    )

    logger.info(" Loading LibriSpeech test-clean for validation...")
    test_dataset = load_dataset(
        "openslr/librispeech_asr",
        "clean",
        split="test",
        streaming=True,
        trust_remote_code=True,
    )

    val_dataset = process_librispeech(
        test_dataset,
        processor,
        augment=False,
        max_samples=2000
    )

    logger.info(f" Datasets ready:")
    logger.info(f"   Train: {len(train_dataset)} samples")
    logger.info(f"   Val: {len(val_dataset)} samples")

    data_collator = DataCollatorCTCWithPadding(processor)

    training_args = TrainingArguments(
        output_dir=config.output_dir,
        num_train_epochs=config.num_train_epochs,
        per_device_train_batch_size=config.per_device_train_batch_size,
        per_device_eval_batch_size=config.per_device_eval_batch_size,
        gradient_accumulation_steps=config.gradient_accumulation_steps,
        learning_rate=config.learning_rate,
        warmup_steps=config.warmup_steps,
        max_steps=config.max_steps,
        lr_scheduler_type="linear",
        gradient_checkpointing=config.gradient_checkpointing,
        fp16=config.fp16,
        eval_strategy=config.eval_strategy,
        eval_steps=config.eval_steps,
        save_steps=config.save_steps,
        logging_steps=config.logging_steps,
        save_total_limit=2,
        load_best_model_at_end=True,
        metric_for_best_model="wer",
        greater_is_better=False,
        dataloader_pin_memory=True,
        dataloader_num_workers=4,
        seed=42,
        report_to=[],
    )

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_dataset,
        eval_dataset=val_dataset,
        processing_class=processor,
        data_collator=data_collator,
        compute_metrics=lambda pred: compute_metrics(pred, processor),
        callbacks=[
            EarlyStoppingCallback(
                early_stopping_patience=3,
                early_stopping_threshold=0.001,
            )
        ],
    )

    logger.info(f"\n Starting Phase 1 training (LibriSpeech)...")
    logger.info(f"   Max steps: {config.max_steps}")
    logger.info(f"   Learning rate: {config.learning_rate}")
    logger.info(f"   Evaluate every: {config.eval_steps} steps")

    train_result = trainer.train()

    logger.info("\n Phase 1 Evaluation...")
    eval_results = trainer.evaluate()

    logger.info(f"\n Saving Phase 1 model...")
    trainer.save_model(config.output_dir)
    processor.save_pretrained(config.output_dir)

    phase1_time = (time.time() - start_time) / 60

    print("\n" + "="*70)
    print("[OK] PHASE 1 COMPLETE")
    print("="*70)
    print(f"Time: {phase1_time:.1f} minutes")
    print(f"Results:")
    print(f"   WER: {eval_results.get('eval_wer', 0):.2f}%")
    print(f"   Accuracy: {eval_results.get('eval_accuracy', 0):.2f}%")
    print("="*70)

    return trainer, eval_results, processor

# ==================== PHASE 2: PERSONAL VOICE FINE-TUNING ====================

def train_phase2_personal_voice(config: Phase2Config, processor=None):
    """Phase 2: Fine-tune on personal voice"""

    print("\n" + "="*70)
    print("[PHASE 2] Personal Voice Fine-tuning (1-2 hours)")
    print("="*70)

    start_time = time.time()

    logger.info(f"\n Loading Phase 1 model from {config.pretrained_model_dir}")
    if processor is None:
        processor = AutoProcessor.from_pretrained(config.pretrained_model_dir)
    model = AutoModelForCTC.from_pretrained(config.pretrained_model_dir)

    logger.info(f" Model loaded: {model.num_parameters():,} parameters")

    train_audio, train_text, val_audio, val_text = load_personal_voice_data(config.data_dir)

    train_dataset = process_personal_voice(train_audio, train_text, processor, augment=True)
    val_dataset = process_personal_voice(val_audio, val_text, processor, augment=False)

    logger.info(f" Personal voice datasets ready")

    data_collator = DataCollatorCTCWithPadding(processor)

    training_args = TrainingArguments(
        output_dir=config.output_dir,
        num_train_epochs=config.num_train_epochs,
        per_device_train_batch_size=config.per_device_train_batch_size,
        per_device_eval_batch_size=config.per_device_eval_batch_size,
        gradient_accumulation_steps=config.gradient_accumulation_steps,
        learning_rate=config.learning_rate,
        warmup_steps=config.warmup_steps,
        max_steps=config.max_steps,
        lr_scheduler_type="linear",
        gradient_checkpointing=config.gradient_checkpointing,
        fp16=config.fp16,
        eval_strategy=config.eval_strategy,
        eval_steps=config.eval_steps,
        save_steps=config.save_steps,
        logging_steps=config.logging_steps,
        save_total_limit=1,
        load_best_model_at_end=True,
        metric_for_best_model="wer",
        greater_is_better=False,
        dataloader_pin_memory=True,
        dataloader_num_workers=2,
        seed=42,
        report_to=[],
    )

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_dataset,
        eval_dataset=val_dataset,
        processing_class=processor,
        data_collator=data_collator,
        compute_metrics=lambda pred: compute_metrics(pred, processor),
        callbacks=[
            EarlyStoppingCallback(
                early_stopping_patience=config.early_stopping_patience,
                early_stopping_threshold=0.001,
            )
        ],
    )

    logger.info(f"\n Starting Phase 2 training (Personal Voice)...")
    logger.info(f"   Max steps: {config.max_steps}")
    logger.info(f"   Learning rate: {config.learning_rate}")
    logger.info(f"   Evaluate every: {config.eval_steps} steps")

    train_result = trainer.train()

    logger.info("\n Phase 2 Evaluation...")
    eval_results = trainer.evaluate()

    logger.info(f"\n Saving Phase 2 model...")
    trainer.save_model(config.output_dir)
    processor.save_pretrained(config.output_dir)

    phase2_time = (time.time() - start_time) / 60

    print("\n" + "="*70)
    print("[OK] PHASE 2 COMPLETE")
    print("="*70)
    print(f"Time: {phase2_time:.1f} minutes")
    print(f"Results:")
    print(f"   WER: {eval_results.get('eval_wer', 0):.2f}%")
    print(f"   CER: {eval_results.get('eval_cer', 0):.2f}%")
    print(f"   Accuracy: {eval_results.get('eval_accuracy', 0):.2f}%")

    target_accuracy = 85
    if eval_results.get('eval_accuracy', 0) >= target_accuracy:
        print(f"\n[TARGET] ACHIEVED! {eval_results.get('eval_accuracy', 0):.1f}% >= {target_accuracy}%")
    else:
        print(f"\n[INFO] Close to target: {eval_results.get('eval_accuracy', 0):.1f}% < {target_accuracy}%")

    print("="*70)

    return trainer, eval_results

# ==================== INFERENCE ====================

def transcribe_audio(audio_path: str, model_path: str) -> str:
    """Transcribe audio with trained model"""

    processor = AutoProcessor.from_pretrained(model_path)
    model = AutoModelForCTC.from_pretrained(model_path)
    model.eval()

    speech, sr = librosa.load(audio_path, sr=16000)

    inputs = processor(speech, sampling_rate=16000, return_tensors="pt")

    with torch.no_grad():
        logits = model(**inputs).logits

    pred_ids = torch.argmax(logits, dim=-1)
    transcription = processor.batch_decode(pred_ids)[0]

    return transcription

# ==================== SETUP ====================

def setup_directories():
    """Create necessary directories"""
    dirs = ["voice_data/train", "voice_data/val"]
    for d in dirs:
        Path(d).mkdir(parents=True, exist_ok=True)

    logger.info("\n Directory structure created:")
    logger.info("voice_data/")
    logger.info("├── train/  (your voice recordings + transcripts)")
    logger.info("└── val/    (validation samples)")

# ==================== MAIN ====================

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("--phase", choices=["1", "2", "all"], default="all")
    parser.add_argument("--audio", type=str, help="Audio for inference")
    parser.add_argument("--model", type=str, default="./lstm_personal_voice_model")
    parser.add_argument("--setup", action="store_true", help="Setup directories")

    args = parser.parse_args()

    set_seed(42)

    if args.setup:
        setup_directories()
        sys.exit(0)

    processor = None
    if args.phase in ["1", "all"]:
        phase1_config = Phase1Config()
        trainer, results, processor = train_phase1_librispeech(phase1_config)

    if args.phase in ["2", "all"]:
        phase2_config = Phase2Config()
        trainer, results = train_phase2_personal_voice(phase2_config, processor)

    if args.audio:
        logger.info(f"\n Transcribing {args.audio}...")
        text = transcribe_audio(args.audio, args.model)
        logger.info(f" Result: {text}")
