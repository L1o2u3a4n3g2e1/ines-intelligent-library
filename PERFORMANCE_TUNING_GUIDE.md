# Performance Tuning Guide
**Digital Library AI Service**  
**Phase:** D3 - Performance Tuning & Optimization  
**Version:** 2.0.0-secure  
**Date:** May 23, 2026  

---

## Table of Contents
1. [Overview](#overview)
2. [Baseline Performance](#baseline-performance)
3. [Bottleneck Analysis](#bottleneck-analysis)
4. [Optimization Strategies](#optimization-strategies)
5. [Implementation & Testing](#implementation--testing)
6. [Performance Benchmarks](#performance-benchmarks)
7. [Monitoring Performance](#monitoring-performance)
8. [Troubleshooting](#troubleshooting)

---

## Overview

### Purpose
Performance tuning optimizes the Digital Library AI Service to meet response time targets while maintaining accuracy and reliability. Using monitoring data from Phase D2, we identify bottlenecks and implement targeted optimizations.

### Key Metrics
- **Error Rate:** Target <0.5%
- **Response Times (P95):** <2 seconds for most endpoints
- **Throughput:** Support 100+ concurrent requests
- **Model Load Time:** <60 seconds (first request)
- **Cached Requests:** <500ms

### Optimization Principles
1. **Measure First:** Use /metrics endpoint to identify actual bottlenecks
2. **Focus on P95/P99:** Optimize slow tail responses, not just averages
3. **Profile Before Optimizing:** Know where time is actually spent
4. **Validate Improvements:** Re-measure after changes
5. **Don't Over-Optimize:** Balance complexity vs. benefit

---

## Baseline Performance

### Establishing Baseline

**Measurement Period:** Run for 30 minutes with normal traffic

```powershell
# Collect baseline metrics
$baseline = @()
for ($i = 1; $i -le 30; $i++) {
    $metrics = curl -s http://localhost:8000/metrics | ConvertFrom-Json
    $baseline += @{
        timestamp = Get-Date
        total_requests = $metrics.total_requests
        total_errors = $metrics.total_errors
        endpoints = $metrics.endpoints
    }
    Start-Sleep -Seconds 60
}

# Export baseline
$baseline | ConvertTo-Json | Out-File "baseline_$(Get-Date -Format yyyyMMdd).json"
```

### Current Baseline (Typical Values)

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| /health avg | <100ms | <100ms | ✓ OK |
| /translate avg | 400-600ms | <500ms | ⚠ Monitor |
| /stt avg | 8-12s | <10s | ⚠ Monitor |
| /tts avg | 2-4s | <3s | ⚠ Monitor |
| /pipeline avg | 10-15s | <12s | ⚠ Monitor |
| P95 response time | <2s (most) | <2s | ✓ OK |
| Error rate | <1% | <0.5% | ✓ OK |
| Rate limit hits | <5/hour | <5/hour | ✓ OK |

---

## Bottleneck Analysis

### Step 1: Monitor Endpoint Performance

```bash
# Get current metrics
curl http://localhost:8000/metrics | jq '.endpoints'

# Identify slow endpoints
curl http://localhost:8000/metrics | jq '.endpoints | to_entries | sort_by(.value.avg_response_time_ms) | reverse'

# Get recent errors
curl http://localhost:8000/errors | jq '.errors | group_by(.endpoint) | map({endpoint: .[0].endpoint, count: length})'
```

### Step 2: Identify Slowest Operations

**Typical Performance Profiles:**

**Speech-to-Text (STT):**
- Model inference: 60-80% of time
- Feature extraction (MFCC): 10-15%
- I/O (file read): 5-10%
- Overhead: <5%

**Translation:**
- Model inference: 70-85%
- Tokenization: 10-15%
- Overhead: <5%

**Text-to-Speech (TTS):**
- Model inference: 80-90%
- Audio encoding: 5-10%
- Overhead: <5%

### Step 3: Resource Profiling

```powershell
# Check CPU/Memory during request
Get-Process python | Select-Object -Property ProcessName, CPU, Memory, Handles | Format-Table

# Monitor while generating load
while ($true) {
    Clear-Host
    Get-Process python | Measure-Object -Property CPU -Sum | Select-Object -Property Sum
    Start-Sleep -Seconds 2
}
```

### Step 4: Common Bottlenecks

**Model Loading (First Request)**
- 30-60 seconds to load models into memory
- Solution: Pre-load models at startup (already implemented)

**Inference Speed**
- CPU vs GPU: GPU ~5-10x faster
- Batch processing: Process multiple inputs together
- Model size: Larger models slower but more accurate

**File I/O**
- Reading audio files from disk
- Solution: Keep frequently accessed files in memory cache

**Memory Pressure**
- Models consume 2-4GB RAM
- Multiple workers increase memory usage
- Solution: Adjust worker count and batch sizes

---

## Optimization Strategies

### 1. Model Optimization

**A. Use Smaller Models (Trade-off: Accuracy vs Speed)**

```python
# Current: Large models for accuracy
# Alternative: Distilled or quantized models

# In app.py, change model IDs:
# RW_STT_MODEL = "openai/whisper-large-v3"  # Current
# RW_STT_MODEL = "openai/whisper-base"      # Faster, less accurate
# RW_STT_MODEL = "openai/whisper-tiny"      # Fastest, least accurate
```

**B. Model Quantization (8-bit)**

```python
# Load models with 8-bit precision instead of 16-bit
model = AutoModelForSpeechSeq2Seq.from_pretrained(
    model_id,
    torch_dtype=torch.int8,  # Changed from torch.float16
    device_map="auto"
)
# Benefit: ~50% faster, 50% less memory
# Trade-off: Slight accuracy loss (~1-2%)
```

**C. Enable Model Caching**

```python
# Already implemented in app.py for translation models
# Verify caching is working:
translation_cache = {}  # Should grow as requests are made

# Check cache hit rate
logger.info(f"Translation cache size: {len(translation_cache)}")
```

### 2. Batch Processing

**A. Implement Batch STT Processing**

```python
@app.post("/stt-batch")
@limiter.limit("5/hour")
async def transcribe_audio_batch(
    request: Request,
    files: List[UploadFile] = File(...),
    language: str = Form(...)
):
    """Process multiple audio files in one request"""
    results = []
    
    # Process all files in sequence
    for file in files:
        audio_array = librosa.load(await file.read())
        result = stt_model.transcribe(audio_array)
        results.append(result)
    
    return {"success": True, "results": results}
```

**B. Batch Translation**

```python
def translate_text_batch(texts: List[str], direction: str):
    """Translate multiple texts in one model call"""
    tokenizer, model = translation_cache[direction]
    
    # Tokenize all at once
    inputs = tokenizer(texts, return_tensors="pt", padding=True).to(device)
    
    # Single forward pass for all texts
    with torch.no_grad():
        outputs = model.generate(**inputs)
    
    # Decode all results
    translations = tokenizer.batch_decode(outputs, skip_special_tokens=True)
    return translations
```

### 3. Caching Strategy

**A. Response Caching (Redis-based)**

```python
from functools import lru_cache

# In-memory cache for recent translations
translation_result_cache = {}

@app.post("/translate")
async def translate(text: str, direction: str, request: Request):
    """Translate with result caching"""
    cache_key = f"{text}:{direction}"
    
    # Check cache
    if cache_key in translation_result_cache:
        logger.info(f"Cache hit: {cache_key}")
        return translation_result_cache[cache_key]
    
    # Perform translation
    result = translate_text(text, direction)
    
    # Cache result (limit to 1000 entries)
    if len(translation_result_cache) > 1000:
        oldest_key = next(iter(translation_result_cache))
        del translation_result_cache[oldest_key]
    
    translation_result_cache[cache_key] = result
    return result
```

**B. Audio File Caching**

```python
# Keep recently processed audio files in memory
from collections import OrderedDict

audio_cache = OrderedDict(maxlen=10)  # Cache last 10 audio files

def get_audio_features(file_path):
    """Get MFCC features with caching"""
    if file_path in audio_cache:
        return audio_cache[file_path]
    
    mfcc = extract_mfcc(file_path)
    audio_cache[file_path] = mfcc
    return mfcc
```

### 4. Async Processing

**A. Non-blocking Requests**

```python
import asyncio
from concurrent.futures import ThreadPoolExecutor

executor = ThreadPoolExecutor(max_workers=4)

@app.post("/stt-async")
async def transcribe_async(file: UploadFile, language: str):
    """Non-blocking STT"""
    loop = asyncio.get_event_loop()
    
    # Run blocking operation in thread pool
    result = await loop.run_in_executor(
        executor,
        lambda: recognize_speech(file.filename, language)
    )
    
    return result
```

### 5. Resource Optimization

**A. Worker Configuration**

```powershell
# Current: 1 worker (safe, lower throughput)
# Optimized: 2-4 workers (higher throughput, more memory)

# Start with 2 workers:
.\venv\Scripts\python -m uvicorn app:app `
  --host 127.0.0.1 --port 8000 --workers 2

# Monitor memory per worker
# If >500MB per worker, reduce workers
# If CPU <80%, increase workers
```

**B. Model Offloading**

```python
# Load less-used models on demand instead of startup
STT_MODELS = {}

def get_stt_model(language):
    """Lazy load STT models"""
    if language not in STT_MODELS:
        logger.info(f"Loading {language} STT model...")
        model = load_model_for_language(language)
        STT_MODELS[language] = model
    return STT_MODELS[language]
```

### 6. GPU Acceleration (If Available)

```python
# In app.py, check for GPU
import torch

device = "cuda:0" if torch.cuda.is_available() else "cpu"
logger.info(f"Using device: {device}")

# If using GPU:
# - Models load 5-10x faster
# - Inference 5-10x faster
# - Requires NVIDIA GPU + CUDA drivers

# Enable GPU:
# 1. Install: pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
# 2. Restart service
# 3. Monitor GPU: nvidia-smi
```

---

## Implementation & Testing

### Performance Optimization Workflow

**Step 1: Measure Baseline**
```powershell
$before = curl -s http://localhost:8000/metrics | ConvertFrom-Json
Write-Host "Before optimization:"
Write-Host "  Avg response time: $($before.endpoints.'/translate'.avg_response_time_ms)ms"
Write-Host "  P95: $($before.endpoints.'/translate'.p95_response_time_ms)ms"
```

**Step 2: Implement One Optimization**
- Make ONE change at a time
- Document the change
- Restart service if needed

**Step 3: Measure Impact**
```powershell
Start-Sleep -Seconds 120  # Wait for 2 minutes of traffic

$after = curl -s http://localhost:8000/metrics | ConvertFrom-Json
Write-Host "After optimization:"
Write-Host "  Avg response time: $($after.endpoints.'/translate'.avg_response_time_ms)ms"
Write-Host "  Improvement: $(($before.endpoints.'/translate'.avg_response_time_ms - $after.endpoints.'/translate'.avg_response_time_ms))ms"
```

**Step 4: Decide**
- If improvement >10%: Keep the change
- If improvement <5%: Revert and try different approach
- If performance degraded: Revert immediately

### Load Testing

**Generate Test Load**

```powershell
# Simple load test script
$token = (curl -s -X POST http://localhost:8000/token | ConvertFrom-Json).access_token
$headers = @{"Authorization" = "Bearer $token"}

# Generate 100 requests
$times = @()
for ($i = 1; $i -le 100; $i++) {
    $start = Measure-Command {
        curl -s -X POST http://localhost:8000/translate `
          -Headers $headers `
          -Body "text=hello&direction=en-rw" | Out-Null
    }
    $times += $start.TotalMilliseconds
    
    if ($i % 10 -eq 0) { Write-Host "Completed $i requests" }
}

# Analyze results
$times | Measure-Object -Average -Minimum -Maximum | Format-Table
```

**Use Apache Bench (ab)**

```bash
# Install: choco install apache-http-server
# Or use pre-built ab.exe

# Test translate endpoint
ab -n 100 -c 10 -p post_data.txt http://localhost:8000/translate

# Parameters:
# -n 100 = total 100 requests
# -c 10 = 10 concurrent requests
# -p file = POST data file
```

---

## Performance Benchmarks

### Target Response Times

| Endpoint | P50 | P95 | P99 | Notes |
|----------|-----|-----|-----|-------|
| /health | <50ms | <100ms | <200ms | Simple check |
| /token | <50ms | <100ms | <150ms | JWT generation |
| /translate | <300ms | <800ms | <1500ms | Model dependent |
| /tts-en | <2000ms | <4000ms | <6000ms | Audio synthesis |
| /tts-rw | <2000ms | <4000ms | <6000ms | Audio synthesis |
| /stt | <5000ms | <12000ms | <20000ms | Audio processing |
| /pipeline | <8000ms | <15000ms | <25000ms | Combined operation |

### Throughput Targets

| Configuration | Requests/Min | Concurrent | Notes |
|---------------|-------------|-----------|-------|
| Single worker | 600-1000 | 5-10 | Default safe config |
| Dual worker | 1200-1800 | 10-20 | Better throughput |
| Quad worker | 1800-2400 | 20-30 | High throughput |

### Memory Usage Targets

| Component | Target | Maximum |
|-----------|--------|---------|
| Python process | 400MB | 600MB |
| Per worker | <500MB | <700MB |
| All models loaded | <2GB | <3GB |

---

## Monitoring Performance

### Daily Performance Review

```powershell
# Get 24-hour performance summary
$metrics = curl -s http://localhost:8000/metrics | ConvertFrom-Json

Write-Host "=== Performance Summary ===" -ForegroundColor Cyan
Write-Host "Uptime: $($metrics.uptime_formatted)"
Write-Host "Total Requests: $($metrics.total_requests)"
Write-Host "Error Rate: $(($metrics.total_errors / $metrics.total_requests * 100))%"

Write-Host "`nSlowest Endpoints:"
$metrics.endpoints | Sort-Object { [double]$_.avg_response_time_ms } -Descending | Select-Object -First 3 | ForEach-Object {
    Write-Host "  $($.Name): $($_.avg_response_time_ms)ms"
}
```

### Weekly Performance Report

```powershell
# Generate weekly report
$report = @"
WEEKLY PERFORMANCE REPORT
Week of: $(Get-Date)

Response Time Trends:
"@

# Collect data for 7 days
# Plot trends
# Identify regressions
# Document improvements

$report | Out-File "performance_report_$(Get-Date -Format yyyyMMdd).txt"
```

### Performance Alerts

```powershell
# Set up alerts for degradation

# Alert conditions:
# 1. Error rate > 5% for 10 minutes
# 2. P95 response time > 2 seconds for 15 minutes
# 3. Rate limit hits > 20 per hour
# 4. Any endpoint down

# Example alert
while ($true) {
    $metrics = curl -s http://localhost:8000/metrics | ConvertFrom-Json
    $errorRate = ($metrics.total_errors / $metrics.total_requests) * 100
    
    if ($errorRate -gt 5) {
        Send-AlertEmail -Subject "ALERT: High error rate" -Body "Error rate: $errorRate%"
    }
    
    Start-Sleep -Seconds 300
}
```

---

## Troubleshooting

### Issue: Translation Endpoint Getting Slower

**Diagnosis:**
```bash
# Check model cache size
curl -s http://localhost:8000/metrics | jq '.endpoints."/translate"'

# Check memory usage
Get-Process python | Select-Object Memory
```

**Solutions:**
1. Limit cache size: Change translation_cache max entries
2. Clear cache on low memory: Implement LRU eviction
3. Use smaller models: Trade accuracy for speed
4. Add more workers: Distribute load

### Issue: STT Endpoint Timeouts

**Diagnosis:**
```bash
# Check recent errors
curl -s http://localhost:8000/errors | jq '.errors[] | select(.endpoint=="/stt")'

# Check audio file handling
# Look for: "Could not process audio" errors
```

**Solutions:**
1. Increase timeout: Edit FastAPI timeout config
2. Process smaller files: Chunk large audio
3. Use async processing: Non-blocking queue
4. Reduce model size: Whisper-base instead of large

### Issue: High Memory Usage

**Diagnosis:**
```powershell
Get-Process python | Measure-Object -Property Memory -Sum

# If > 3GB total:
# 1. Too many workers
# 2. Memory leak in code
# 3. Too large models
```

**Solutions:**
1. Reduce workers: From 4 to 2
2. Disable cache: Or limit size
3. Use smaller models: Distilled versions
4. Monitor for leaks: Check memory over time

---

## Optimization Checklist

### Quick Wins (Implement First)
- [ ] Enable result caching for translations
- [ ] Configure workers: Start with 2
- [ ] Set up monitoring alerts
- [ ] Generate baseline performance metrics
- [ ] Review most recent error logs

### Medium Effort (Good ROI)
- [ ] Implement batch processing endpoints
- [ ] Add async endpoints for long operations
- [ ] Optimize model loading order
- [ ] Implement request-level caching
- [ ] Test with load generation

### Advanced (If Needed)
- [ ] Add GPU support
- [ ] Implement model quantization
- [ ] Deploy caching layer (Redis)
- [ ] Implement request queuing
- [ ] A/B test different models

### Performance Validation
- [ ] Measure baseline (30 min)
- [ ] Implement one optimization
- [ ] Measure impact (2 min)
- [ ] Validate accuracy not degraded
- [ ] Document results
- [ ] Repeat for next optimization

---

## Success Criteria

**Phase D3 is complete when:**

✓ Baseline performance measured and documented  
✓ Bottlenecks identified using monitoring data  
✓ At least 3 optimization strategies implemented  
✓ Performance improvements validated (>10% improvement)  
✓ Load testing completed successfully  
✓ Performance report generated  
✓ Alerting system configured  

---

**Next Phase:** Post-deployment monitoring and maintenance  
**Review Date:** June 23, 2026  
**Status:** Ready for Implementation
