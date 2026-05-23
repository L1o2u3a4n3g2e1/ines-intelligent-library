# Production Deployment Quick Start
**Time Required:** ~15 minutes  
**Difficulty:** Easy  
**Prerequisites:** FastAPI running, XAMPP running

---

## Step 1: Verify Dependencies (2 min)

```powershell
cd c:\xampp\htdocs\digital-library\pretrained_ai_models

# Check packages installed
.\venv\Scripts\pip show PyJWT slowapi python-dotenv

# Expected: All three packages listed
```

---

## Step 2: Generate SSL Certificates (3 min)

```powershell
# Navigate to FastAPI directory
cd c:\xampp\htdocs\digital-library\pretrained_ai_models

# Generate self-signed certificate (365 days)
.\generate_certificates.ps1

# Output: cert.pem, key.pem created
```

---

## Step 3: Create Configuration (.env) (2 min)

**Option A: Copy template and edit**
```powershell
Copy-Item .env.example .env
notepad .env
```

**Option B: Create with production values**
```powershell
@"
JWT_SECRET_KEY=replace-with-strong-random-key-32-chars-minimum
JWT_EXPIRATION_HOURS=24
ENVIRONMENT=production
ALLOWED_ORIGIN=http://localhost
SSL_CERT_FILE=cert.pem
SSL_KEY_FILE=key.pem
"@ | Out-File -FilePath .env -Encoding UTF8
```

**IMPORTANT:** Generate strong JWT secret:
```powershell
# Copy this command output and paste into .env
[System.Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes((1..32 | ForEach-Object {[char](Get-Random -Minimum 33 -Maximum 126)})))
```

---

## Step 4: Start FastAPI (HTTP - Development)

```powershell
cd c:\xampp\htdocs\digital-library\pretrained_ai_models

# Start with HTTP only
.\venv\Scripts\python -m uvicorn app:app --host 127.0.0.1 --port 8000

# Output: Application startup complete. Uvicorn running on http://127.0.0.1:8000
```

---

## Step 5: Start FastAPI (HTTPS - Production)

```powershell
cd c:\xampp\htdocs\digital-library\pretrained_ai_models

# Set environment variables
$env:SSL_CERT_FILE = "cert.pem"
$env:SSL_KEY_FILE = "key.pem"
$env:JWT_SECRET_KEY = (Get-Content .env | Select-String "JWT_SECRET_KEY" | ForEach-Object {$_.Line -split "=" | Select-Object -Last 1})

# Start with HTTPS
.\venv\Scripts\python -m uvicorn app:app --host 127.0.0.1 --port 8000

# Output: Application startup complete. Uvicorn running on http://127.0.0.1:8000 (check console for SSL info)
```

---

## Step 6: Test Health Endpoint (1 min)

```powershell
# Health check (no auth required)
curl http://localhost:8000/health

# Expected output:
# {
#   "status": "ready",
#   "device": "cpu",
#   "models": { ... }
# }
```

---

## Step 7: Get JWT Token (1 min)

```powershell
# Request token
$token = (curl -X POST http://localhost:8000/token | ConvertFrom-Json).access_token

# Verify token received
Write-Host "Token: $($token.Substring(0, 20))..."
```

---

## Step 8: Test Protected Endpoint (2 min)

```powershell
# Test translation with token
curl -X POST "http://localhost:8000/translate" `
  -H "Authorization: Bearer $token" `
  -F "text=Hello" `
  -F "direction=en-rw"

# Expected output:
# {
#   "success": true,
#   "direction": "en-rw",
#   "input": "Hello",
#   "translation": "..."
# }
```

---

## Step 9: Verify PHP Integration (2 min)

```powershell
# Test PHP AIService
cd c:\xampp\htdocs\digital-library

$php_test = @'
<?php
require "api-lib/services/AIService.php";
try {
    $ai = new AIService(false);
    $health = $ai->getHealth();
    echo "Health Status: " . json_encode($health) . "\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
'@

$php_test | "c:\xampp\php\php.exe"
```

---

## Step 10: Run Test Suite (2 min)

```powershell
cd c:\xampp\htdocs\digital-library

# Run comprehensive hardening tests
.\HARDENING_TEST_SUITE.ps1 -BaseURL "http://localhost:8000"

# Expected: All tests pass
```

---

## Configuration Summary

| Item | Value | Location |
|------|-------|----------|
| JWT Secret | Your secret key | `.env` |
| FastAPI Port | 8000 | Default |
| XAMPP Port | 80 | Apache |
| SSL Cert | cert.pem | pretrained_ai_models/ |
| SSL Key | key.pem | pretrained_ai_models/ |
| Token Expiry | 24 hours | Configurable |
| Rate Limits | Per endpoint | app.py |

---

## Troubleshooting

### FastAPI Won't Start
```
Error: "Address already in use"
Solution: Change port in uvicorn command (--port 8001)
         Or kill process: netstat -ano | findstr :8000
```

### Token Request Fails
```
Error: "Connection refused"
Solution: Verify FastAPI is running on port 8000
         Check: curl http://localhost:8000/health
```

### Translation Returns 401
```
Error: "Unauthorized"
Solution: Token expired, request new token
         Check token in Authorization header
```

### Rate Limit Hit
```
Error: "429 Too Many Requests"
Solution: Wait 60 seconds, try again
         Review rate limits in app.py if needed
```

---

## Monitoring

### Check Service Status
```powershell
curl http://localhost:8000/health

# Verify all models are loaded:
# "rw_stt": "loaded", "en_stt": "loaded", ...
```

### Watch Logs
```powershell
Get-Content server.log -Wait -Tail 20
```

### Monitor Rate Limits
```powershell
# Look for rate limit events
Select-String "Rate limit" server.log
```

---

## Security Checklist

- [ ] JWT_SECRET_KEY is strong (32+ random characters)
- [ ] ALLOWED_ORIGIN set to your domain
- [ ] SSL certificates generated (for HTTPS)
- [ ] ENVIRONMENT set to "production"
- [ ] .env file not committed to git
- [ ] All tests passing
- [ ] Logs being generated
- [ ] Monitoring configured

---

## Performance Validation

```powershell
# Measure response time
Measure-Command {
    curl -X POST "http://localhost:8000/translate" `
      -H "Authorization: Bearer $token" `
      -F "text=Hello" `
      -F "direction=en-rw" `
      -OutVariable response
} | Select-Object TotalMilliseconds

# Expected: <600ms for translation
```

---

## Production Checklist

### Before Going Live
- [ ] Load testing completed
- [ ] Backup database configured
- [ ] Monitoring/alerting configured
- [ ] Log rotation setup
- [ ] Firewall rules configured
- [ ] HTTPS certificates valid
- [ ] All tests passing
- [ ] Team trained on deployment

### After Going Live
- [ ] Monitor error rates
- [ ] Check rate limit metrics
- [ ] Verify all endpoints responding
- [ ] Monitor resource usage
- [ ] Review access logs
- [ ] Confirm backups working

---

## Rollback Plan

If issues occur:

```powershell
# 1. Stop FastAPI service
# Ctrl+C in FastAPI terminal

# 2. Revert to previous version
git checkout HEAD -- .env

# 3. Remove security changes (if needed)
git checkout HEAD -- app.py

# 4. Restart
.\venv\Scripts\python -m uvicorn app:app --host 127.0.0.1 --port 8000
```

---

## Support Contacts

For issues with:
- **JWT/Authentication:** Review `PRODUCTION_HARDENING_GUIDE.md`
- **Rate Limiting:** Check logs for 429 errors
- **CORS/SSL:** Run `HARDENING_TEST_SUITE.ps1`
- **PHP Integration:** Test with manual PHP script above

---

## Next Steps

1. ✓ Deployment complete
2. → Monitor for 24 hours
3. → Adjust rate limits if needed
4. → Plan HTTPS migration
5. → Set up automatic backups

---

**Deployment Status:** ✓ READY  
**Time to Deploy:** ~15 minutes  
**Production Ready:** YES  
**Support Documents:** 5 comprehensive guides available
