# Deployment Runbook
**For:** Digital Library AI Service  
**Environment:** Windows/XAMPP  
**Last Updated:** May 23, 2026  

---

## Table of Contents
1. [Pre-Deployment](#pre-deployment)
2. [Deployment Steps](#deployment-steps)
3. [Post-Deployment](#post-deployment)
4. [Rollback](#rollback)
5. [Troubleshooting](#troubleshooting)

---

## Pre-Deployment

### Prerequisites Checklist
- [ ] Git repository cloned
- [ ] Python virtual environment created
- [ ] Dependencies installed (pip install -r requirements.txt)
- [ ] XAMPP running (Apache + MySQL)
- [ ] .env file created with production values
- [ ] SSL certificates generated (optional but recommended)
- [ ] Backup of current configuration

### Verification Commands
```powershell
# Check Python version
python --version
# Expected: Python 3.9+

# Check virtual environment active
.\venv\Scripts\python --version

# Check dependencies
pip list | Select-String "PyJWT|slowapi|python-dotenv"
# Expected: All three packages

# Check XAMPP services
Get-Service | Select-String "Apache|MySQL"
```

---

## Deployment Steps

### Step 1: Stop Current Service (2 min)
```powershell
Write-Host "[*] Stopping current FastAPI instance..."
Get-Process python -ErrorAction SilentlyContinue | `
  Where-Object {$_.CommandLine -like "*uvicorn*"} | `
  Stop-Process -Force
Start-Sleep -Seconds 3
Write-Host "[OK] Service stopped"
```

### Step 2: Backup Current Configuration (1 min)
```powershell
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
Copy-Item "pretrained_ai_models\.env" `
  "pretrained_ai_models\.env.backup.$timestamp"
Copy-Item "api-lib/services/AIService.php" `
  "api-lib/services/AIService.php.backup.$timestamp"
Write-Host "[OK] Configuration backed up ($timestamp)"
```

### Step 3: Update Environment Variables (2 min)
```powershell
# Option A: Manual update
notepad "pretrained_ai_models\.env"

# Option B: Script-based update
$env_vars = @{
    "JWT_SECRET_KEY" = "your-strong-random-key"
    "ENVIRONMENT" = "production"
    "ALLOWED_ORIGIN" = "http://localhost"
}
# Update .env with new values
```

**Required Variables:**
```
JWT_SECRET_KEY=<32-char-random-string>
JWT_EXPIRATION_HOURS=24
ENVIRONMENT=production
ALLOWED_ORIGIN=http://localhost
DEBUG=false
FASTAPI_HOST=127.0.0.1
FASTAPI_PORT=8000
FFMPEG_PATH=C:\Users\...\FFmpeg\bin
```

### Step 4: Update Dependencies (3 min)
```powershell
cd "pretrained_ai_models"
.\venv\Scripts\pip install --upgrade pip
.\venv\Scripts\pip install -r requirements.txt
Write-Host "[OK] Dependencies updated"
```

### Step 5: Start FastAPI Service (5 min)
```powershell
cd "pretrained_ai_models"

# Option A: Single process (development)
.\venv\Scripts\python -m uvicorn app:app `
  --host 127.0.0.1 --port 8000

# Option B: Multiple workers (production)
.\venv\Scripts\python -m uvicorn app:app `
  --host 127.0.0.1 --port 8000 --workers 4

# Option C: With HTTPS
$env:SSL_CERT_FILE = "cert.pem"
$env:SSL_KEY_FILE = "key.pem"
.\venv\Scripts\python -m uvicorn app:app `
  --host 127.0.0.1 --port 8000 --workers 4
```

### Step 6: Verify Service Health (2 min)
```powershell
# Wait for service to start
Start-Sleep -Seconds 5

# Health check
$response = Invoke-WebRequest -Uri "http://localhost:8000/health" `
  -UseBasicParsing
$data = ConvertFrom-Json $response.Content

if ($data.status -eq "ready") {
    Write-Host "[OK] Service healthy"
    Write-Host "     Models: $($data.models | ConvertTo-Json)"
} else {
    Write-Host "[FAIL] Service not ready"
    exit 1
}
```

### Step 7: Test JWT Authentication (2 min)
```powershell
# Get token
$token_response = Invoke-WebRequest -Uri "http://localhost:8000/token" `
  -Method POST -UseBasicParsing
$token_data = ConvertFrom-Json $token_response.Content

if ($token_data.access_token) {
    Write-Host "[OK] JWT authentication working"
    Write-Host "     Token: $($token_data.access_token.Substring(0, 20))..."
} else {
    Write-Host "[FAIL] JWT authentication failed"
    exit 1
}
```

### Step 8: Test PHP Integration (3 min)
```powershell
# Run integration test
& "c:\xampp\php\php.exe" "test_jwt_integration.php"

# Expected: All tests pass
```

---

## Post-Deployment

### Immediate Verification (5 min)
```powershell
# Run test suite
.\HARDENING_TEST_SUITE.ps1 -BaseURL "http://localhost:8000"

# Expected: 90%+ tests passing
```

### Health Checks (Daily)
```powershell
# Check service status
$health = Invoke-WebRequest -Uri "http://localhost:8000/health" `
  -UseBasicParsing | ConvertFrom-Json

$all_loaded = $health.models.Values | Where-Object {$_ -ne "loaded"} | Measure
if ($all_loaded.Count -eq 0) {
    Write-Host "[OK] All models operational"
} else {
    Write-Host "[WARN] Some models not loaded"
}
```

### Documentation Update
- [ ] Update CHANGELOG.md with deployment date
- [ ] Document any configuration changes
- [ ] Update runbook with lessons learned
- [ ] Share deployment notes with team

### Monitoring Setup
- [ ] Enable FastAPI logs
- [ ] Set up error alerts
- [ ] Configure rate limit monitoring
- [ ] Plan daily review schedule

---

## Rollback

### Quick Rollback (If Issues Found)

**Step 1: Stop Service**
```powershell
Get-Process python | Where-Object {$_.CommandLine -like "*uvicorn*"} | Stop-Process -Force
```

**Step 2: Restore Backup**
```powershell
# Find latest backup
$latest_backup = Get-ChildItem "pretrained_ai_models\.env.backup.*" | `
  Sort-Object LastWriteTime -Descending | Select-Object -First 1

Copy-Item $latest_backup.FullName "pretrained_ai_models\.env" -Force
```

**Step 3: Restart Service**
```powershell
cd "pretrained_ai_models"
.\venv\Scripts\python -m uvicorn app:app --host 127.0.0.1 --port 8000
```

**Step 4: Verify Rollback**
```powershell
Start-Sleep -Seconds 5
Invoke-WebRequest -Uri "http://localhost:8000/health" -UseBasicParsing
```

### Full Rollback (If Major Issues)
```powershell
# 1. Restore all backups
Get-ChildItem "*.backup.*" | ForEach-Object {
    Copy-Item $_.FullName $_.BaseName -Force
}

# 2. Restore database (if applicable)
# mysql -u root < backup.sql

# 3. Restart all services
Restart-Service Apache2.4
Restart-Service MySQL

# 4. Verify system
# Test all critical endpoints
```

---

## Troubleshooting

### Service Won't Start

**Symptom:** "Address already in use"

**Solution:**
```powershell
# Find process using port 8000
Get-NetTCPConnection -LocalPort 8000 | Select-Object OwningProcess
Stop-Process -Id <PID> -Force
```

**Symptom:** "ModuleNotFoundError"

**Solution:**
```powershell
# Reinstall dependencies
.\venv\Scripts\pip install --force-reinstall -r requirements.txt
```

### JWT Not Working

**Symptom:** "401 Unauthorized"

**Solution:**
```powershell
# Check JWT_SECRET_KEY in .env
Get-Content "pretrained_ai_models\.env" | Select-String "JWT_SECRET_KEY"

# Regenerate token
curl -X POST http://localhost:8000/token
```

### Models Not Loading

**Symptom:** "rw_stt: failed" in health check

**Solution:**
```powershell
# Check logs for error messages
# Verify internet connection (for model download)
# Check disk space (models require ~5GB)
```

### FFmpeg Issues

**Symptom:** "ffmpeg was not found"

**Solution:**
```powershell
# Verify FFmpeg path in .env
Get-Content "pretrained_ai_models\.env" | Select-String "FFMPEG_PATH"

# Test FFmpeg
& "C:\path\to\ffmpeg.exe" -version
```

### Rate Limiting Issues

**Symptom:** 429 errors too frequently

**Solution:**
```powershell
# Check current limits in app.py
# Adjust rate limits for your usage pattern
# Document new limits in configuration

# Example: Change /translate from 100/hour to 200/hour
# Edit: @limiter.limit("200/hour")
```

---

## Deployment Checklist

### Pre-Deployment
- [ ] All tests passing locally
- [ ] Code reviewed
- [ ] Configuration prepared
- [ ] Backup created
- [ ] Team notified

### During Deployment
- [ ] Service stopped
- [ ] Configuration updated
- [ ] Service started
- [ ] Health checks pass
- [ ] Tests run successfully

### Post-Deployment
- [ ] Monitoring enabled
- [ ] Logs reviewed
- [ ] Team notified
- [ ] Documentation updated
- [ ] Issues tracked

---

## Key Contacts

| Role | Contact | Available |
|------|---------|-----------|
| Admin | System Administrator | 24/7 on-call |
| Dev Lead | Development Lead | Business hours |
| On-Call | On-call Engineer | Rotating schedule |

---

## Quick Commands Reference

```powershell
# Start service
cd c:\xampp\htdocs\digital-library\pretrained_ai_models
.\venv\Scripts\python -m uvicorn app:app --host 127.0.0.1 --port 8000 --workers 4

# Stop service
Get-Process python | Where-Object {$_.CommandLine -like "*uvicorn*"} | Stop-Process -Force

# Check health
Invoke-WebRequest http://localhost:8000/health

# Check logs
Get-Content pretrained_ai_models\uvicorn.log -Tail 50

# Test JWT
curl -X POST http://localhost:8000/token

# Run tests
.\HARDENING_TEST_SUITE.ps1

# Rollback
Copy-Item pretrained_ai_models\.env.backup.* pretrained_ai_models\.env -Force
```

---

**Last Reviewed:** May 23, 2026  
**Next Review:** June 23, 2026  
**Status:** APPROVED FOR USE
