# Monitoring & Logging Guide
**Digital Library AI Service**  
**Version:** 2.0.0-secure  
**Last Updated:** May 23, 2026  

---

## Table of Contents
1. [Overview](#overview)
2. [Logging Setup](#logging-setup)
3. [Metrics Collection](#metrics-collection)
4. [Monitoring Endpoints](#monitoring-endpoints)
5. [Alert Configuration](#alert-configuration)
6. [Troubleshooting](#troubleshooting)
7. [Best Practices](#best-practices)

---

## Overview

### Purpose
Comprehensive monitoring tracks application health, performance metrics, and error patterns to enable proactive issue detection and rapid incident response.

### Key Components
- **Structured Logging:** Categorized logs with multiple levels (INFO, WARNING, ERROR)
- **Metrics Collection:** Real-time performance data aggregation
- **Health Monitoring:** Service health status with model availability tracking
- **Alert System:** Automated notifications for critical conditions
- **Log Rotation:** Automatic log file management to prevent disk overflow

### Monitoring Architecture
```
Application
    ↓
Metrics Collector (in-memory)
    ↓
├─ Endpoint Metrics (requests, errors, response times)
├─ Error Log (error events with timestamps)
├─ Rate Limit Log (rate limit enforcement events)
└─ Auth Failure Log (authentication issues)
    ↓
Monitoring Endpoints (/metrics, /health, /status)
    ↓
Dashboards & Alerts
```

---

## Logging Setup

### Log Levels

| Level | Usage | Example |
|-------|-------|---------|
| DEBUG | Detailed diagnostic info | Function entry/exit, variable values |
| INFO | General informational | Model loading, request processing |
| WARNING | Warning conditions | High error rate, deprecated usage |
| ERROR | Error events | Request failures, model load failures |
| CRITICAL | Critical issues | Service failure, data corruption |

### Log Configuration

**Basic Setup (in app.py):**
```python
from monitoring_service import setup_logging

logger = setup_logging(
    app_name="digital-library-ai",
    log_level=logging.INFO  # Change to DEBUG for troubleshooting
)
```

**Environment Variable Control:**
```powershell
# In .env file
LOG_LEVEL=INFO
LOG_DIR=logs
LOG_MAX_SIZE=10485760  # 10MB
LOG_BACKUP_COUNT=5
```

### Log File Location

```
pretrained_ai_models/
├── logs/
│   ├── app.log           (Current log file)
│   ├── app.log.1         (Previous backup)
│   ├── app.log.2
│   └── app.log.5         (Oldest backup)
└── app.py
```

### Log Rotation

**Automatic Rotation Triggers:**
- File size exceeds 10MB
- Daily rotation (optional enhancement)
- Application startup

**Manual Rotation:**
```powershell
# Archive current logs
Get-ChildItem logs\app.log* | ForEach-Object {
    Rename-Item $_.FullName "$($_.FullName).$(Get-Date -Format yyyyMMdd)"
}
```

### Viewing Logs

**Real-time monitoring (last 50 lines):**
```powershell
Get-Content logs\app.log -Tail 50 -Wait
```

**Filter by level:**
```powershell
Get-Content logs\app.log | Select-String "ERROR"
Get-Content logs\app.log | Select-String "WARNING"
```

**Search for specific endpoint:**
```powershell
Get-Content logs\app.log | Select-String "/translate"
```

---

## Metrics Collection

### Collected Metrics

**Per-Endpoint Metrics:**
- Total requests count
- Error count and rate
- Rate-limited request count
- Response times (average, P50, P95, P99)
- Last error and timestamp

**System Metrics:**
- Application uptime
- Total requests across all endpoints
- Total errors and error rate
- Authentication failures
- Device usage (CPU/GPU)

### Metrics Example

```json
{
  "timestamp": "2026-05-23T14:30:00Z",
  "uptime_seconds": 3600,
  "endpoints": {
    "/translate": {
      "total_requests": 150,
      "error_count": 2,
      "error_rate": "1.33%",
      "avg_response_time_ms": "450.25",
      "p95_response_time_ms": "850.50",
      "p99_response_time_ms": "1200.75"
    },
    "/stt": {
      "total_requests": 45,
      "error_count": 1,
      "error_rate": "2.22%",
      "avg_response_time_ms": "8500.10",
      "p95_response_time_ms": "15000.00"
    }
  },
  "total_requests": 500,
  "total_errors": 5,
  "error_rate": "1.00%"
}
```

### Accessing Metrics via Code

```python
from monitoring_service import MetricsCollector

collector = MetricsCollector()

# Record a successful request
collector.record_request("/translate", status_code=200, response_time=0.45)

# Record an error
collector.record_error("/stt", "ModelError", "Model not loaded")

# Get summary
summary = collector.get_metrics_summary()
print(summary['total_requests'])
print(summary['endpoints']['/translate']['error_rate'])
```

---

## Monitoring Endpoints

### 1. Health Check (No Auth)
**GET** `/health`

Returns service status and model availability.

```bash
curl http://localhost:8000/health
```

**Response:**
```json
{
  "status": "ready",
  "device": "cpu",
  "models": {
    "rw_stt": "loaded",
    "en_stt": "loaded",
    "rw_tts": "loaded",
    "en_tts": "loaded"
  }
}
```

**Status Values:**
- `ready` - All models loaded and operational
- `warming` - Models loading on first request
- `degraded` - Some models unavailable
- `unavailable` - Service not ready

---

### 2. Detailed Metrics (No Auth)
**GET** `/metrics`

Returns comprehensive performance metrics.

```bash
curl http://localhost:8000/metrics
```

**Response:**
```json
{
  "timestamp": "2026-05-23T14:30:00Z",
  "uptime_seconds": 3600,
  "endpoints": {
    "/translate": {
      "total_requests": 150,
      "error_count": 2,
      "error_rate": "1.33%",
      "avg_response_time_ms": "450.25",
      "p50_response_time_ms": "400.10",
      "p95_response_time_ms": "850.50",
      "p99_response_time_ms": "1200.75",
      "last_error": "HTTPException",
      "last_error_time": "2026-05-23T14:15:30Z"
    }
  },
  "total_requests": 500,
  "total_errors": 5,
  "total_rate_limits": 2,
  "auth_failures": 0
}
```

---

### 3. Error Log (No Auth)
**GET** `/errors?limit=20`

Returns recent errors with timestamps.

```bash
curl http://localhost:8000/errors
curl "http://localhost:8000/errors?limit=50"
```

**Response:**
```json
{
  "errors": [
    {
      "timestamp": "2026-05-23T14:15:30Z",
      "endpoint": "/stt",
      "type": "AudioProcessingError",
      "message": "Invalid audio format: expected WAV"
    },
    {
      "timestamp": "2026-05-23T14:10:15Z",
      "endpoint": "/translate",
      "type": "ModelError",
      "message": "Translation model failed"
    }
  ],
  "count": 2
}
```

---

### 4. Rate Limit Events (No Auth)
**GET** `/rate-limits?limit=20`

Returns recent rate limit enforcement events.

```bash
curl http://localhost:8000/rate-limits
```

**Response:**
```json
{
  "rate_limit_events": [
    {
      "timestamp": "2026-05-23T14:25:00Z",
      "endpoint": "/token",
      "client_ip": "127.0.0.1"
    }
  ],
  "count": 1
}
```

---

### 5. Authentication Failures (No Auth)
**GET** `/auth-failures?limit=20`

Returns recent authentication failures.

```bash
curl http://localhost:8000/auth-failures
```

**Response:**
```json
{
  "auth_failures": [
    {
      "timestamp": "2026-05-23T14:20:00Z",
      "reason": "Token has expired",
      "client_ip": "192.168.1.100"
    }
  ],
  "count": 1
}
```

---

## Alert Configuration

### Alert Thresholds

| Metric | Warning | Critical | Action |
|--------|---------|----------|--------|
| Error Rate | >1% | >5% | Review logs, check models |
| Response Time (P95) | >2000ms | >5000ms | Investigate bottleneck |
| Rate Limit Hits | >5/hour | >20/hour | Adjust limits or notify clients |
| Auth Failures | >3/hour | >10/hour | Check for attack pattern |
| Uptime | N/A | Service down | Restart service |
| Model Status | Partial | Any unavailable | Check logs, reload model |

### Setting Up Alerts

**PowerShell Alert Monitor:**
```powershell
$BaseURL = "http://localhost:8000"
$CheckInterval = 60  # seconds

while ($true) {
    try {
        $metrics = (Invoke-WebRequest "$BaseURL/metrics" -UseBasicParsing).Content | ConvertFrom-Json
        
        # Check error rate
        if ($metrics.total_errors -gt 0) {
            $errorRate = ($metrics.total_errors / $metrics.total_requests) * 100
            if ($errorRate -gt 5) {
                Write-Host "[ALERT] High error rate: $($errorRate)%" -ForegroundColor Red
                # Send notification here
            }
        }
        
        # Check endpoint health
        foreach ($endpoint in $metrics.endpoints.PSObject.Properties) {
            $metric = $endpoint.Value
            if ($metric.avg_response_time_ms -gt 2000) {
                Write-Host "[WARN] Slow endpoint: $($endpoint.Name) - $($metric.avg_response_time_ms)ms" -ForegroundColor Yellow
            }
        }
    } catch {
        Write-Host "[ERROR] Failed to check metrics: $_" -ForegroundColor Red
    }
    
    Start-Sleep -Seconds $CheckInterval
}
```

**Email Alert Integration:**
```powershell
function Send-AlertEmail {
    param(
        [string]$Subject,
        [string]$Body,
        [string]$ToAddress = "admin@example.com"
    )
    
    $SMTPClient = New-Object Net.Mail.SmtpClient("localhost")
    $SMTPClient.Send("alerts@service.local", $ToAddress, $Subject, $Body)
}

# Usage in alert logic:
if ($errorRate -gt 5) {
    Send-AlertEmail -Subject "High Error Rate Alert" `
                   -Body "Error rate exceeded 5%: $errorRate%"
}
```

---

## Troubleshooting

### Issue: High Error Rate

**Diagnosis:**
```bash
# Check detailed metrics
curl http://localhost:8000/metrics | jq '.endpoints[] | select(.error_count > 0)'

# View recent errors
curl http://localhost:8000/errors?limit=50
```

**Solution:**
1. Check logs for error details: `Get-Content logs\app.log | Select-String "ERROR"`
2. Verify model status: `curl http://localhost:8000/health`
3. Check system resources: `Get-Process python | Select CPU, Memory`
4. Restart service if needed: See DEPLOYMENT_RUNBOOK.md

### Issue: Slow Response Times

**Diagnosis:**
```bash
# Get response time percentiles
curl http://localhost:8000/metrics | jq '.endpoints."/translate"'

# Check system resources
Get-Process python | Select ProcessName, CPU, Memory, Handles
```

**Solution:**
1. Reduce batch sizes if processing large files
2. Check disk I/O: `Get-PhysicalDisk | Get-StorageReliabilityCounter`
3. Consider using GPU if available: See app.py device configuration
4. Scale to multiple workers: Update DEPLOYMENT_RUNBOOK.md step 5

### Issue: Rate Limiting Triggering Too Often

**Diagnosis:**
```bash
# Check rate limit events
curl http://localhost:8000/rate-limits | jq '.rate_limit_events | length'
```

**Solution:**
1. Review rates in ADMINISTRATOR_GUIDE.md
2. Adjust limits if legitimate usage: Edit app.py @limiter.limit() decorators
3. Implement caching on client side to reduce requests
4. Document new limits in CHANGELOG.md

### Issue: Authentication Failures

**Diagnosis:**
```bash
# Check failed auth attempts
curl http://localhost:8000/auth-failures | jq '.auth_failures'
```

**Solutions by Type:**
- **Token Expired:** Client needs to refresh token from /token endpoint
- **Invalid Token:** Check JWT_SECRET_KEY matches between client and server
- **Missing Token:** Verify Authorization header is sent correctly

---

## Best Practices

### 1. Monitoring Schedule

**Real-time (Continuous):**
- Health check every 30 seconds
- Error log review on alert triggers

**Hourly:**
- Review endpoint metrics and error rates
- Check for suspicious rate limit patterns

**Daily:**
- Generate performance summary report
- Review authentication failure patterns
- Archive daily logs

**Weekly:**
- Analyze performance trends
- Plan capacity adjustments
- Review alert threshold effectiveness

**Monthly:**
- Generate full performance audit
- Plan upgrades if needed
- Update runbook with lessons learned

### 2. Log Retention Policy

```powershell
# Archive logs older than 30 days
$LogDir = "logs"
$ArchiveDir = "logs\archive"
New-Item -ItemType Directory $ArchiveDir -Force

Get-ChildItem "$LogDir\app.log*" | Where-Object {
    (Get-Date).AddDays(-30) -gt $_.LastWriteTime
} | Move-Item -Destination $ArchiveDir -Force
```

### 3. Metrics Analysis

**Healthy Service Indicators:**
- Error rate < 1%
- P95 response time < 2 seconds for most endpoints
- Auth failures < 1/hour
- Rate limit triggers < 5/hour
- Model status: all loaded

**Degraded Service Indicators:**
- Error rate 1-5%
- P95 response time 2-5 seconds
- Auth failures 1-5/hour
- Rate limit triggers 5-20/hour
- Some models unavailable

### 4. Performance Baseline

**Establish baseline on clean deployment:**
```powershell
# Run this 2-3 times daily for a week
$metrics = (curl -s http://localhost:8000/metrics | ConvertFrom-Json).endpoints
$metrics | ConvertTo-Json | Out-File "baseline_$(Get-Date -Format yyyyMMdd).json"
```

**Compare against baseline:**
```powershell
# Alert if deviation > 20%
$baseline = (Get-Content "baseline_20260523.json") | ConvertFrom-Json
$current = (curl -s http://localhost:8000/metrics | ConvertFrom-Json).endpoints

foreach ($endpoint in $baseline.PSObject.Properties) {
    $baselineTime = [double]$endpoint.Value.avg_response_time_ms
    $currentTime = [double]$current.($endpoint.Name).avg_response_time_ms
    $deviation = (($currentTime - $baselineTime) / $baselineTime) * 100
    
    if ([Math]::Abs($deviation) -gt 20) {
        Write-Host "[ALERT] $($endpoint.Name) deviation: $deviation%" -ForegroundColor Yellow
    }
}
```

### 5. Critical Alert Responses

**Service Down:**
- [ ] Verify process: `Get-Process python | Where CommandLine -like "*uvicorn*"`
- [ ] Check port: `Get-NetTCPConnection -LocalPort 8000`
- [ ] Restart service using DEPLOYMENT_RUNBOOK.md
- [ ] Verify all models load: `curl http://localhost:8000/health`
- [ ] Notify team

**High Error Rate (>5%):**
- [ ] Check recent errors: `curl http://localhost:8000/errors`
- [ ] Review logs: `Get-Content logs\app.log -Tail 100`
- [ ] Check model status: `curl http://localhost:8000/health`
- [ ] If model failed: restart service
- [ ] If persistent: escalate to tech lead

**Attack Pattern (>10 auth failures/hour):**
- [ ] Review failed IPs: `curl http://localhost:8000/auth-failures`
- [ ] Check for rate limit trigger: `curl http://localhost:8000/rate-limits`
- [ ] Update firewall rules if needed
- [ ] Alert security team
- [ ] Document incident

---

## Performance Target Summary

| Metric | Target | Acceptable | Alert Threshold |
|--------|--------|-----------|-----------------|
| Error Rate | <0.5% | <1% | >5% |
| Response Time (P95) | <500ms | <2000ms | >5000ms |
| Uptime | >99% | >95% | <90% |
| Model Load Time | <30s | <60s | Not applicable |
| Auth Failures | <1/hour | <5/hour | >10/hour |

---

## Dashboard Access

**Local Metrics Dashboard (to be added):**
```
http://localhost:8000/dashboard
```

**Command-line Quick Check:**
```powershell
function Get-ServiceHealth {
    $health = curl -s http://localhost:8000/health | ConvertFrom-Json
    $metrics = curl -s http://localhost:8000/metrics | ConvertFrom-Json
    
    Write-Host "=== Digital Library AI Service ===" -ForegroundColor Cyan
    Write-Host "Status: $($health.status)" -ForegroundColor $(if($health.status -eq 'ready') {'Green'} else {'Red'})
    Write-Host "Uptime: $($metrics.uptime_formatted)"
    Write-Host "Total Requests: $($metrics.total_requests)"
    Write-Host "Error Rate: $($metrics.total_requests -gt 0 ? "$([math]::Round($metrics.total_errors/$metrics.total_requests*100, 2))%" : "N/A")"
    Write-Host "Models: $($health.models | ConvertTo-Json -Compress)"
}

Get-ServiceHealth
```

---

**For questions about monitoring setup, contact the Digital Library AI team.**  
**Next Phase:** Performance Tuning (D3)
