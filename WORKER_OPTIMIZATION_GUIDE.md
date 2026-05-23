# Worker Configuration Optimization Guide
**Digital Library AI Service**  
**Phase:** D3 - Performance Tuning  
**Version:** 2.0.0-secure  
**Date:** May 23, 2026  

---

## Overview

FastAPI/Uvicorn worker configuration is critical for balancing throughput and resource usage. This guide explains how to optimize worker count for your system.

---

## Current Configuration

**Default Setup:** 1 worker (safe, lower throughput)

```powershell
python -m uvicorn app:app --host 127.0.0.1 --port 8000
# Equivalent to: --workers 1
```

**Problem:** Single worker can process only one request at a time. Additional requests queue up, causing latency.

---

## Understanding Worker Count

### What is a Worker?

- Each worker is a separate Python process running the FastAPI application
- Workers process requests in parallel
- More workers = higher throughput, but more memory usage

### Formula for Optimal Worker Count

```
Recommended Workers = (CPU Cores × 2) + 1
```

For example:
- 2-core system: (2 × 2) + 1 = **5 workers**
- 4-core system: (4 × 2) + 1 = **9 workers**
- 8-core system: (8 × 2) + 1 = **17 workers**

**However:** Memory constraints often limit this. See memory analysis below.

---

## Finding Your System Specifications

### Get CPU Core Count

```powershell
# PowerShell
(Get-CimInstance Win32_Processor).NumberOfCores

# Example output: 4
```

### Get Available RAM

```powershell
# Total RAM
(Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1GB

# Available RAM
(Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory / 1MB

# Example output: 16 GB total, 8 GB available
```

### Get Current CPU Usage

```powershell
# Single snapshot
Get-Process python | Measure-Object -Property CPU -Sum

# Continuous monitoring (5 measurements)
for ($i = 1; $i -le 5; $i++) {
    $cpu = (Get-Process python | Measure-Object -Property CPU -Sum).Sum
    $mem = (Get-Process python | Measure-Object -Property WorkingSet -Sum).Sum / 1MB
    Write-Host "CPU: $($cpu)% | Memory: $([math]::Round($mem))MB"
    Start-Sleep -Seconds 2
}
```

---

## Memory Analysis

### Baseline Memory per Worker

Each worker uses approximately **350-500MB** of RAM due to loaded AI models:

- MARIAN Translation models: ~200MB
- Whisper STT models: ~150MB
- VITS TTS models: ~150MB
- Python/FastAPI overhead: ~50MB

**Total per worker: ~500MB average**

### Memory Calculation

```
Total Memory Used = (Worker Count × 500MB) + 100MB (system overhead)
```

### Safe Worker Count

Based on available RAM (assuming 500MB per worker):

| Available RAM | Recommended Workers | Max Workers |
|---------------|---------------------|------------|
| 2 GB | 3 | 4 |
| 4 GB | 7 | 8 |
| 8 GB | 15 | 16 |
| 16 GB | 31 | 32 |

**Rule of thumb:** Use 30-50% of available RAM for workers

---

## Recommended Configurations

### Conservative (Stability Priority)

**When:** Testing, production with single machine, limited resources

```powershell
# 2-4 workers
python -m uvicorn app:app --host 127.0.0.1 --port 8000 --workers 2
```

- Memory: ~1.1 GB
- Throughput: ~20-30 req/sec
- Tail latency: Low
- Risk of failure: Low

### Balanced (Recommended)

**When:** Production with moderate load

```powershell
# 4-8 workers based on system
python -m uvicorn app:app --host 127.0.0.1 --port 8000 --workers 4
```

- Memory: ~2.1 GB
- Throughput: ~40-50 req/sec
- Tail latency: Acceptable
- Risk of failure: Low-Medium

### Aggressive (Throughput Priority)

**When:** High load production, adequate resources

```powershell
# 8-16 workers
python -m uvicorn app:app --host 127.0.0.1 --port 8000 --workers 8
```

- Memory: ~4.1 GB
- Throughput: ~80-100 req/sec
- Tail latency: May increase
- Risk of failure: Medium

---

## Step-by-Step Optimization Process

### 1. Establish Baseline (Current Configuration)

```powershell
# Start with 1 worker
python -m uvicorn app:app --host 127.0.0.1 --port 8000 --workers 1

# In another PowerShell window, run load test
.\PERFORMANCE_OPTIMIZATION_SCRIPT.ps1 -Mode baseline -Duration 60
```

Record:
- Average response time
- P95 response time
- Throughput (requests/second)
- Memory usage
- CPU usage

### 2. Test Conservative Configuration (2 workers)

```powershell
# Stop current service (Ctrl+C)
# Then restart with 2 workers
python -m uvicorn app:app --host 127.0.0.1 --port 8000 --workers 2

# Monitor for 2 minutes
# Check: Is memory stable? Is CPU <80%?
Get-Process python | Select-Object -Property ProcessName, CPU, @{
    Name = "Memory(MB)"; 
    Expression = {$_.WorkingSet / 1MB}
} | Format-Table -AutoSize
```

Run load test again:
```powershell
.\PERFORMANCE_OPTIMIZATION_SCRIPT.ps1 -Mode baseline -Duration 60
```

Compare results with 1-worker baseline.

### 3. Test Balanced Configuration (4 workers)

```powershell
python -m uvicorn app:app --host 127.0.0.1 --port 8000 --workers 4
Start-Sleep -Seconds 120

.\PERFORMANCE_OPTIMIZATION_SCRIPT.ps1 -Mode baseline -Duration 60
```

### 4. Compare and Choose

Create a comparison table:

| Metric | 1 Worker | 2 Workers | 4 Workers |
|--------|----------|-----------|-----------|
| Avg Response (ms) | XXX | XXX | XXX |
| P95 Response (ms) | XXX | XXX | XXX |
| Throughput (req/s) | XXX | XXX | XXX |
| Memory (MB) | XXX | XXX | XXX |
| CPU (%) | XXX | XXX | XXX |

**Choose the configuration that:**
- Has lowest P95 response time
- Memory usage <50% of available RAM
- CPU usage <80%

---

## Starting Service with Optimal Workers

### Method 1: Command Line

```powershell
# Start with determined optimal worker count
python -m uvicorn app:app `
    --host 127.0.0.1 `
    --port 8000 `
    --workers 4 `
    --log-level info
```

### Method 2: Batch File (Recommended for Production)

Create `start_fastapi_optimized.bat`:

```batch
@echo off
REM Digital Library AI Service - Optimized Startup
REM Worker count optimized for production

cd /d "%~dp0"
set PYTHONUNBUFFERED=1

REM Set FFmpeg path for STT support
set PATH=C:\Users\Anne Louange\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.1.1-full_build\bin;%PATH%

REM Start with 4 workers (optimized for production)
python -m uvicorn app:app ^
    --host 127.0.0.1 ^
    --port 8000 ^
    --workers 4 ^
    --log-level info

pause
```

Then execute:
```powershell
.\start_fastapi_optimized.bat
```

### Method 3: PowerShell Script

Create `Start-AIService.ps1`:

```powershell
param(
    [int]$Workers = 4,
    [string]$Host = "127.0.0.1",
    [int]$Port = 8000
)

Write-Host "Starting Digital Library AI Service" -ForegroundColor Green
Write-Host "Workers: $Workers | Host: $Host | Port: $Port" -ForegroundColor Cyan

# Set environment
$env:PYTHONUNBUFFERED = "1"
$env:PATH = "C:\Users\Anne Louange\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.1.1-full_build\bin;" + $env:PATH

# Start service
& python -m uvicorn app:app `
    --host $Host `
    --port $Port `
    --workers $Workers `
    --log-level info
```

Usage:
```powershell
.\Start-AIService.ps1 -Workers 4
```

---

## Monitoring Worker Performance

### Real-Time Monitoring

```powershell
while ($true) {
    Clear-Host
    $processes = Get-Process python
    Write-Host "FastAPI Workers Status - $(Get-Date -Format 'HH:mm:ss')" -ForegroundColor Green
    Write-Host "======================================="
    
    $totalMem = 0
    $totalCPU = 0
    
    $processes | ForEach-Object {
        $mem = $_.WorkingSet / 1MB
        $cpu = $_.CPU
        $totalMem += $mem
        $totalCPU += $cpu
        Write-Host "PID $($_.Id): CPU=$($cpu)% | Memory=$([math]::Round($mem))MB"
    }
    
    Write-Host "======================================="
    Write-Host "Total: CPU=$([math]::Round($totalCPU))% | Memory=$([math]::Round($totalMem))MB"
    Write-Host "Refresh in 5 seconds..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
}
```

### Check Memory per Worker

```powershell
# Average memory per worker
$processes = Get-Process python
$totalMem = ($processes | Measure-Object -Property WorkingSet -Sum).Sum / 1MB
$workerCount = $processes.Count
$avgPerWorker = $totalMem / $workerCount

Write-Host "Total Memory: $([math]::Round($totalMem))MB"
Write-Host "Worker Count: $workerCount"
Write-Host "Avg per Worker: $([math]::Round($avgPerWorker))MB"
```

---

## Troubleshooting Worker Issues

### Symptom: Out of Memory Errors

**Cause:** Too many workers for available RAM

**Solution:**
```powershell
# Reduce worker count
python -m uvicorn app:app --host 127.0.0.1 --port 8000 --workers 2
```

### Symptom: High Response Times (>2s)

**Cause 1:** Too few workers for load

**Solution:** Increase workers
```powershell
python -m uvicorn app:app --host 127.0.0.1 --port 8000 --workers 6
```

**Cause 2:** Worker processes overloaded

**Solution:** Check CPU usage. If >80%, either reduce load or add more workers.

### Symptom: Intermittent 502 Bad Gateway

**Cause:** Worker process crashes

**Solution:** Monitor logs for exceptions. Reduce worker count if memory-related.

```powershell
# Run with error logging
python -m uvicorn app:app --host 127.0.0.1 --port 8000 --workers 4 --log-level debug
```

---

## Performance Targets

| Metric | Target | Action if Below Target |
|--------|--------|------------------------|
| P95 Response Time | <2000ms | Increase workers |
| P99 Response Time | <3000ms | Increase workers |
| Throughput | >50 req/sec | Increase workers |
| Memory per Worker | <600MB | OK, monitor for growth |
| CPU Usage | <80% | OK, can add more workers |
| Error Rate | <0.5% | Investigate errors |

---

## Summary

1. **Check your system:** CPU cores and available RAM
2. **Calculate recommendation:** (Cores × 2) + 1, limited by memory
3. **Test incrementally:** Start with 2, then 4, then 8 workers
4. **Choose balanced config:** Best P95 time, memory <50% available
5. **Monitor production:** Track memory and CPU during operations
6. **Adjust as needed:** Increase workers if P95 time increases, decrease if memory pressure

---

## Next Steps

Once worker optimization is complete:

1. Run performance comparison test: `.\PERFORMANCE_OPTIMIZATION_SCRIPT.ps1 -Mode compare`
2. Document final worker count in runbook
3. Deploy with optimized worker count
4. Monitor P95/P99 metrics in production
5. Adjust if traffic patterns change

**Expected Improvement:** 20-100% throughput increase with proper worker tuning
