# Monitoring Quick Reference Card
**Digital Library AI Service - One-Page Cheat Sheet**

---

## 🚀 Start Monitoring

```powershell
# Real-time PowerShell Dashboard
.\MONITORING_DASHBOARD.ps1

# Web Browser Dashboard
http://localhost/digital-library/monitoring_status.php

# Command Line Health Check
curl http://localhost:8000/health
```

---

## 📊 Key Monitoring Endpoints

| URL | Purpose |
|-----|---------|
| `/health` | Service & model status |
| `/metrics` | Performance metrics (requests, errors, times) |
| `/errors?limit=20` | Recent errors with timestamps |
| `/rate-limits?limit=20` | Rate limit enforcement events |
| `/auth-failures?limit=20` | Authentication failures |

---

## 🔴 Alert Thresholds

| Metric | ⚠️ Warning | 🚨 Critical |
|--------|-----------|-----------|
| Error Rate | >1% | >5% |
| Response Time (P95) | >2000ms | >5000ms |
| Rate Limit Hits | >5/hour | >20/hour |
| Auth Failures | >3/hour | >10/hour |

---

## 📈 Common Queries

**PowerShell:**
```powershell
# Get metrics
curl -s http://localhost:8000/metrics | ConvertFrom-Json | Format-List

# Get endpoint errors
curl -s http://localhost:8000/errors?limit=50 | ConvertFrom-Json

# Get error rate
$m = curl -s http://localhost:8000/metrics | ConvertFrom-Json
$m.total_errors / $m.total_requests * 100
```

**Bash/cURL:**
```bash
# Get metrics as JSON
curl http://localhost:8000/metrics | jq '.'

# Get translate endpoint metrics
curl -s http://localhost:8000/metrics | jq '.endpoints."/translate"'

# Get errors of specific type
curl -s http://localhost:8000/errors | jq '.errors[] | select(.type=="AudioProcessingError")'
```

**PHP:**
```php
$monitor = new MonitoringService();
$summary = $monitor->getSummary();
echo $monitor->generateHTMLReport();
```

---

## 📋 Daily Checklist

- [ ] Check health status: `/health`
- [ ] Review error rate in metrics
- [ ] Check response times (P95)
- [ ] Monitor auth failures
- [ ] Monitor rate limit hits
- [ ] Verify all models loaded

---

## 🔧 Troubleshooting Quick Fixes

| Problem | Solution |
|---------|----------|
| Service Down | `Get-Process python -CommandLine "*uvicorn*"` |
| Metrics not updating | Restart FastAPI service |
| High error rate (>5%) | Check `/errors` endpoint, review logs |
| Slow responses | Check P95 in metrics, may need optimization |
| High auth failures | Verify JWT_SECRET_KEY, check client code |
| Rate limit abuse | Review `/rate-limits`, adjust if needed |

---

## 📁 Key Files

| File | Purpose |
|------|---------|
| `monitoring_service.py` | Core monitoring module |
| `MONITORING_DASHBOARD.ps1` | PowerShell dashboard |
| `monitoring_status.php` | Web dashboard |
| `api-lib/services/MonitoringService.php` | PHP client |
| `MONITORING_AND_LOGGING_GUIDE.md` | Full documentation |
| `MONITORING_SETUP_GUIDE.md` | Integration guide |
| `logs/app.log` | Application logs |

---

## ⏱️ Response Time Targets

| Endpoint | Target | Acceptable | Alert |
|----------|--------|-----------|-------|
| /health | <100ms | <200ms | >200ms |
| /token | <50ms | <100ms | >100ms |
| /translate | <500ms | <1000ms | >2000ms |
| /tts | <3000ms | <5000ms | >5000ms |
| /stt | <10000ms | <20000ms | >20000ms |

---

## 🔐 Security Monitoring

**Commands:**
```bash
# Get auth failure rate
curl -s http://localhost:8000/auth-failures | jq '.auth_failures | length'

# Get rate limit hits today
curl -s http://localhost:8000/rate-limits | jq '.rate_limit_events | length'

# Check for attack patterns (many failures from one IP)
curl -s http://localhost:8000/auth-failures | jq '.auth_failures | group_by(.client_ip) | map({ip: .[0].client_ip, count: length})'
```

---

## 📊 Health Status Meanings

| Status | Meaning | Action |
|--------|---------|--------|
| Healthy | <0.5% error rate | Continue monitoring |
| Degraded | 0.5-1% error rate | Investigate soon |
| Unhealthy | >5% error rate | Investigate immediately |

---

## 🛠️ Model Status Values

| Status | Meaning |
|--------|---------|
| loaded | Model ready and operational |
| failed | Model failed to load (restart service) |
| loading | Initial startup (wait 30-60s) |
| unavailable | Model not available (check resources) |

---

## 📝 Log Management

```powershell
# View recent logs
Get-Content logs\app.log -Tail 50

# Search for errors
Get-Content logs\app.log | Select-String "ERROR"

# Archive old logs
Get-ChildItem logs\app.log* | Where-Object {
    (Get-Date).AddDays(-30) -gt $_.LastWriteTime
} | Move-Item -Destination logs\archive
```

---

## 🎯 Performance Baseline (Clean Deployment)

- Total Requests: 0-1000/hour (steady state)
- Error Rate: <0.5%
- P95 Response Time: <2 seconds (most endpoints)
- Auth Failures: <1/hour
- Rate Limit Hits: <5/hour
- Uptime: >99%

---

## ⚡ Quick Actions

**Restart Service:**
```powershell
Get-Process python | Where-Object {$_.CommandLine -like "*uvicorn*"} | Stop-Process -Force
# Then restart from DEPLOYMENT_RUNBOOK.md step 5
```

**Clear Metrics (After Restart):**
```powershell
# Metrics reset automatically when service restarts
# Logs are preserved
```

**Check Resource Usage:**
```powershell
Get-Process python | Select ProcessName, CPU, Memory
# CPU: <20% sustained
# Memory: <500MB per worker
```

---

## 📞 Escalation Path

1. **Green Light (Healthy)**
   - Continue normal monitoring
   - No action needed

2. **Yellow Light (Warning - 1 hour)**
   - Review logs
   - Check specific endpoint
   - Document issue

3. **Red Light (Critical - Now)**
   - Check logs immediately
   - Identify root cause
   - Restart if needed
   - Notify team

---

## 🔗 Related Documentation

- **Full Guide:** MONITORING_AND_LOGGING_GUIDE.md
- **Setup:** MONITORING_SETUP_GUIDE.md
- **Admin Tasks:** ADMINISTRATOR_GUIDE.md
- **Deployment:** DEPLOYMENT_RUNBOOK.md
- **API Docs:** API_DOCUMENTATION.md

---

## 📱 Mobile Friendly

Access monitoring on phone:
```
http://localhost/digital-library/monitoring_status.php
```

Dashboard is responsive and works on mobile/tablet browsers.

---

**Keep this reference card handy for daily monitoring operations.**

Last Updated: May 23, 2026
