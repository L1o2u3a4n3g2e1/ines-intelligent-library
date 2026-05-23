# Administrator Guide
**Digital Library AI Service**  
**Version:** 2.0.0-secure  
**Last Updated:** May 23, 2026  

---

## Table of Contents
1. [Daily Operations](#daily-operations)
2. [User Management](#user-management)
3. [Performance Monitoring](#performance-monitoring)
4. [Security Management](#security-management)
5. [Backup & Recovery](#backup--recovery)
6. [Maintenance](#maintenance)

---

## Daily Operations

### Service Health Check (Daily)
```powershell
# Check if service is running
Get-Process python | Where-Object {$_.CommandLine -like "*uvicorn*"}

# Test health endpoint
curl -s http://localhost:8000/health | ConvertFrom-Json | ConvertTo-Json

# Review error logs (last 100 lines)
Get-Content -Path "pretrained_ai_models\logs\uvicorn.log" -Tail 100 -Wait
```

### Expected Status
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

### Response Time Targets
| Endpoint | Target | Acceptable Range |
|----------|--------|------------------|
| /health | <100ms | <200ms |
| /token | <50ms | <100ms |
| /translate | <500ms | <1000ms |
| /tts | <3000ms | <5000ms |
| /stt | <10000ms | <20000ms |

---

## User Management

### JWT Tokens

**Understanding Token Lifecycle:**
- **Generation:** User requests /token endpoint (no auth required)
- **Usage:** Token included in Authorization header
- **Expiration:** 24 hours from generation
- **Refresh:** Automatic in PHP client (5-min buffer)

**Monitoring Token Usage:**
```powershell
# Check token generation rate
Get-EventLog -LogName Application -Source "FastAPI" -Newest 100 | `
  Where-Object {$_.Message -like "*token*"} | `
  Measure-Object

# Expected: Normal rate varies by usage pattern
```

### Rate Limit Management

**Current Limits:**
```
/token:     10 requests/minute (prevents abuse)
/health:   100 requests/minute (health check monitoring)
/translate: 100 requests/hour (normal text translation)
/stt:       10 requests/hour (heavy computation)
/tts:       50 requests/hour (audio synthesis)
/pipeline:  10 requests/hour (complex operation)
```

**Adjusting Rate Limits:**
1. Edit `pretrained_ai_models/app.py`
2. Find `@limiter.limit()` decorators
3. Update rate values (format: "N/minute" or "N/hour")
4. Restart FastAPI service
5. Document changes in CHANGELOG

**Example: Increase translation limit**
```python
# Before:
@limiter.limit("100/hour")
async def translate(...):

# After:
@limiter.limit("200/hour")
async def translate(...):
```

---

## Performance Monitoring

### CPU & Memory Usage
```powershell
# Check FastAPI process
Get-Process python | Where-Object {$_.CommandLine -like "*uvicorn*"} | `
  Select-Object ProcessName, CPU, Memory

# Expected:
# - CPU: <20% sustained
# - Memory: <500MB per worker
```

### Response Times

**Measure endpoint performance:**
```powershell
# Translation endpoint
$times = @()
for ($i = 1; $i -le 10; $i++) {
    $start = Get-Date
    $token = curl -s -X POST http://localhost:8000/token | ConvertFrom-Json
    $headers = @{"Authorization" = "Bearer $($token.access_token)"}
    curl -s -X POST http://localhost:8000/translate `
      -Headers $headers -Body "text=hello&direction=en-rw" | Out-Null
    $elapsed = (Get-Date) - $start
    $times += $elapsed.TotalMilliseconds
}
Write-Host "Average: $([math]::Round(($times | Measure-Object -Average).Average, 2))ms"
```

### Model Load Times

**First request after startup (model warming):**
- STT models: 30-60 seconds
- TTS models: 20-40 seconds
- Translation model: 5-10 seconds

**Subsequent requests: <2 seconds** (cached in memory)

---

## Security Management

### JWT Secret Management

**Current Secret:**
- Location: `pretrained_ai_models/.env` (JWT_SECRET_KEY)
- Length: 32+ characters
- Rotation: Annually or on compromise
- Storage: Never in version control, only .env file

**Rotating JWT Secret:**
```powershell
# 1. Generate new secret
$new_secret = -join ((33..126) | Get-Random -Count 32 | ForEach-Object {[char]$_})

# 2. Update .env file
(Get-Content "pretrained_ai_models\.env") -replace `
  'JWT_SECRET_KEY=.*', "JWT_SECRET_KEY=$new_secret" | `
  Set-Content "pretrained_ai_models\.env"

# 3. Restart service (existing tokens become invalid)
Get-Process python | Where-Object {$_.CommandLine -like "*uvicorn*"} | Stop-Process -Force

# 4. Notify users of service restart
```

### CORS Configuration

**Current Settings:**
- Allowed Origins: http://localhost
- Allowed Methods: GET, POST
- Allowed Headers: Content-Type, Authorization
- Max Age: 600 seconds

**Updating CORS Settings:**
```python
# In app.py, find:
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Authorization"],
    max_age=600,
)

# Change allow_origins list to add new domains:
allow_origins=["http://localhost", "https://yourdomain.com"],
```

### Access Control

**Authentication Flow:**
```
Client Request
    ↓
Get /token (rate limited: 10/min)
    ↓
Receive JWT token (24-hour validity)
    ↓
Include in Authorization header
    ↓
Protected endpoint verifies token
    ↓
Grant/deny access
```

**Monitoring Authentication Failures:**
```powershell
# Check 401 errors (authentication failures)
Get-EventLog -LogName Application -Newest 1000 | `
  Where-Object {$_.Message -like "*401*"} | `
  Measure-Object
```

---

## Backup & Recovery

### Daily Backups

**Backup Configuration:**
```powershell
# Create backup directory
New-Item -ItemType Directory "backups\$((Get-Date).ToString('yyyyMMdd'))" -Force

# Backup critical files
$date = Get-Date -Format "yyyyMMdd_HHmmss"
Copy-Item "pretrained_ai_models\.env" "backups\.env.$date"
Copy-Item "api-lib\services\AIService.php" "backups\AIService.php.$date"
Copy-Item "pretrained_ai_models\requirements.txt" "backups\requirements.txt.$date"
```

**Automated Daily Backup:**
```powershell
# Add to Windows Task Scheduler
$action = New-ScheduledTaskAction -Execute "powershell.exe" `
  -Argument "-File backup.ps1"
$trigger = New-ScheduledTaskTrigger -Daily -At 2:00AM
Register-ScheduledTask -Action $action -Trigger $trigger -TaskName "AIService-Backup"
```

### Recovery Procedure

**Restore from Backup:**
```powershell
# 1. Stop service
Get-Process python | Stop-Process -Force

# 2. Restore files
$latest = Get-ChildItem "backups\.env.*" | Sort-Object -Descending | Select-Object -First 1
Copy-Item $latest.FullName "pretrained_ai_models\.env" -Force

# 3. Restart service
cd "pretrained_ai_models"
.\venv\Scripts\python -m uvicorn app:app --host 127.0.0.1 --port 8000

# 4. Verify health
Start-Sleep -Seconds 5
Invoke-WebRequest http://localhost:8000/health
```

### Database Backups (if using)
```bash
# MySQL backup
mysqldump -u root -p --all-databases > backup_$(date +%Y%m%d).sql

# Restore
mysql -u root -p < backup_20260523.sql
```

---

## Maintenance

### Monthly Tasks

**Update Dependencies:**
```powershell
cd "pretrained_ai_models"
.\venv\Scripts\pip install --upgrade pip setuptools wheel
.\venv\Scripts\pip install --upgrade -r requirements.txt
```

**Review Security Logs:**
```powershell
# Check for unusual patterns
Get-EventLog -LogName Application -Newest 5000 | `
  Where-Object {$_.Source -like "*FastAPI*" -or $_.Source -like "*Error*"} | `
  Select-Object TimeGenerated, Message | `
  Export-Csv -Path "security_review_$(Get-Date -Format yyyyMM).csv"
```

**Performance Analysis:**
```powershell
# Generate performance report
$report = @"
Performance Report - $(Get-Date)

Average Response Times:
$(./performance_test.ps1)

Resource Usage:
$(Get-Process python | Select-Object CPU, Memory)

Error Rate:
$(Get-EventLog Application -Newest 10000 | Where-Object Level -Like "*Error*" | Measure)
"@

$report | Out-File "reports\perf_$(Get-Date -Format yyyyMM).txt"
```

### Quarterly Tasks

**Security Audit:**
1. Review JWT secret age (rotate if >6 months)
2. Check CORS configuration
3. Audit rate limiting effectiveness
4. Review access logs for suspicious activity

**Model Updates:**
1. Check for newer model versions
2. Test new models in staging
3. Deploy to production if improvements found

**Capacity Planning:**
1. Review growth trends
2. Estimate future resource needs
3. Plan hardware upgrades if needed

---

## Troubleshooting Matrix

| Issue | Symptom | Solution | Time |
|-------|---------|----------|------|
| Service down | No response to /health | Check process, restart | 5min |
| JWT failing | 401 errors | Verify token, check secret | 10min |
| Slow responses | >5sec latency | Check logs, review rate limits | 15min |
| Model failure | "model: failed" | Check disk space, restart | 20min |
| Rate limit abuse | 429 errors | Check logs, adjust limits | 10min |
| FFmpeg error | STT 500 error | Check PATH, restart Python | 10min |

---

## Emergency Contacts

| Title | Name | Phone | Email |
|-------|------|-------|-------|
| System Admin | [Admin Name] | [Phone] | [Email] |
| Tech Lead | [Lead Name] | [Phone] | [Email] |
| On-Call | [Name] | [Phone] | [Email] |

---

## Escalation Procedure

**Level 1: Handle Locally (Admin)**
- Service restart
- Rate limit adjustment
- Log review
- JWT secret rotation

**Level 2: Contact Tech Lead**
- Code changes needed
- Model updates
- Database issues
- Architecture changes

**Level 3: Emergency Escalation**
- Total service failure
- Data loss risk
- Security breach
- Customer impact

---

## Documentation

- **API Documentation:** API_DOCUMENTATION.md
- **Deployment Runbook:** DEPLOYMENT_RUNBOOK.md
- **Hardening Guide:** PRODUCTION_HARDENING_GUIDE.md
- **Troubleshooting:** Below
- **Changelog:** CHANGELOG.md

---

## Quick Reference

**Start Service:**
```powershell
cd c:\xampp\htdocs\digital-library\pretrained_ai_models
.\venv\Scripts\python -m uvicorn app:app --host 127.0.0.1 --port 8000 --workers 4
```

**Check Health:**
```powershell
curl http://localhost:8000/health
```

**View Logs:**
```powershell
Get-Content -Path "pretrained_ai_models\logs\uvicorn.log" -Tail 50 -Wait
```

**Stop Service:**
```powershell
Get-Process python | Where-Object {$_.CommandLine -like "*uvicorn*"} | Stop-Process -Force
```

---

**Approved by:** System Administrator  
**Effective Date:** May 23, 2026  
**Next Review:** August 23, 2026
