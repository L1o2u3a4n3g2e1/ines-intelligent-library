# Monitoring Setup & Integration Guide
**Digital Library AI Service**  
**For:** Phase D2 - Monitoring & Logging Implementation  

---

## Quick Start

### 1. Enable Monitoring in FastAPI (app.py)

Add the monitoring service to your existing app.py:

```python
# At the top of app.py, add:
from monitoring_service import MetricsCollector, setup_logging

# After FastAPI app initialization, add:
metrics_collector = MetricsCollector()

# Replace existing logging setup with:
logger = setup_logging(
    app_name="digital-library-ai",
    log_level=logging.INFO
)
```

### 2. Add Monitoring Endpoints

Add these endpoints to app.py (after existing endpoints):

```python
@app.get("/metrics")
@limiter.limit("100/minute")
async def get_metrics(request: Request):
    """Get comprehensive performance metrics"""
    return metrics_collector.get_metrics_summary()

@app.get("/errors")
@limiter.limit("100/minute")
async def get_errors(request: Request, limit: int = 20):
    """Get recent error log"""
    return {
        "errors": metrics_collector.get_recent_errors(limit),
        "count": len(list(metrics_collector.error_log))
    }

@app.get("/rate-limits")
@limiter.limit("100/minute")
async def get_rate_limits(request: Request, limit: int = 20):
    """Get recent rate limit events"""
    return {
        "rate_limit_events": metrics_collector.get_recent_rate_limits(limit),
        "count": len(list(metrics_collector.rate_limit_log))
    }

@app.get("/auth-failures")
@limiter.limit("100/minute")
async def get_auth_failures(request: Request, limit: int = 20):
    """Get recent authentication failures"""
    return {
        "auth_failures": metrics_collector.get_auth_failures(limit),
        "count": len(list(metrics_collector.auth_failures))
    }
```

### 3. Integrate Metrics Recording

Add metrics recording to your endpoint decorator:

```python
# Create a middleware or wrapper to record metrics
from time import time

@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time()
    response = await call_next(request)
    process_time = time() - start_time
    
    # Record metrics
    metrics_collector.record_request(
        endpoint=request.url.path,
        status_code=response.status_code,
        response_time=process_time
    )
    
    response.headers["X-Process-Time"] = str(process_time)
    return response
```

### 4. Record Errors and Auth Failures

In your error handlers:

```python
@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Log all exceptions to metrics"""
    metrics_collector.record_error(
        endpoint=request.url.path,
        error_type=type(exc).__name__,
        message=str(exc)
    )
    
    logger.error(f"Unhandled exception in {request.url.path}: {exc}")
    
    return {
        "detail": "An error occurred processing your request",
        "error": str(exc) if os.getenv("ENVIRONMENT") != "production" else None
    }
```

For auth failures:

```python
def verify_token(credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer())):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        metrics_collector.record_auth_failure("Token expired", request.client.host)
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        metrics_collector.record_auth_failure("Invalid token", request.client.host)
        raise HTTPException(status_code=401, detail="Invalid token")
```

For rate limiting:

```python
@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    """Record rate limit hits"""
    metrics_collector.record_rate_limit_hit(
        endpoint=request.url.path,
        client_ip=request.client.host if request.client else "unknown"
    )
    
    logger.warning(f"Rate limit exceeded for {request.client.host} on {request.url.path}")
    
    return JSONResponse(
        status_code=429,
        content={
            "detail": "Rate limit exceeded. Too many requests.",
            "retry_after": 60
        }
    )
```

---

## Accessing Monitoring Data

### From PowerShell

**Start the monitoring dashboard:**
```powershell
.\MONITORING_DASHBOARD.ps1
.\MONITORING_DASHBOARD.ps1 -Interval 15 -BaseURL "http://localhost:8000"
```

**Quick health check:**
```powershell
curl http://localhost:8000/health | ConvertFrom-Json | Format-List

curl http://localhost:8000/metrics | ConvertFrom-Json | Format-List
```

**Get specific endpoint metrics:**
```powershell
$metrics = curl -s http://localhost:8000/metrics | ConvertFrom-Json
$metrics.endpoints."/translate"
```

### From PHP

**Use MonitoringService class:**
```php
<?php
require_once 'api-lib/services/MonitoringService.php';

$monitoring = new MonitoringService('http://127.0.0.1:8000');

// Get summary
$summary = $monitoring->getSummary();
echo "Status: " . $summary['health_check'];
echo "Error Rate: " . $summary['error_rate'];

// Get specific endpoint metrics
$metrics = $monitoring->getEndpointMetrics('/translate');
echo "Error rate: " . $metrics['error_rate'];

// Check health
echo "Healthy: " . ($monitoring->isEndpointHealthy('/stt') ? 'Yes' : 'No');

// Get HTML report
echo $monitoring->generateHTMLReport();
?>
```

**View monitoring status page:**
```
http://localhost/digital-library/monitoring_status.php
```

### From cURL

```bash
# Get all metrics
curl http://localhost:8000/metrics

# Get errors only
curl "http://localhost:8000/errors?limit=50"

# Get rate limit events
curl "http://localhost:8000/rate-limits?limit=20"

# Get auth failures
curl "http://localhost:8000/auth-failures?limit=20"

# Parse with jq
curl -s http://localhost:8000/metrics | jq '.endpoints."/translate"'
curl -s http://localhost:8000/errors | jq '.errors[] | select(.type=="AudioProcessingError")'
```

---

## Monitoring Files Created

| File | Purpose |
|------|---------|
| `monitoring_service.py` | Core metrics collection and logging (Python) |
| `MONITORING_AND_LOGGING_GUIDE.md` | Comprehensive operational guide |
| `MONITORING_DASHBOARD.ps1` | Real-time PowerShell monitoring dashboard |
| `api-lib/services/MonitoringService.php` | PHP client for accessing metrics |
| `monitoring_status.php` | Web-based status dashboard |
| `MONITORING_SETUP_GUIDE.md` | This file - integration instructions |

---

## Configuration Options

### Log Levels

Set in environment or at runtime:

```python
# DEBUG - Detailed diagnostic information
# INFO - General application flow
# WARNING - Warning conditions
# ERROR - Error events
# CRITICAL - Critical system failures

# Set via environment
os.environ['LOG_LEVEL'] = 'DEBUG'

# Or in code
logger = setup_logging(app_name="app", log_level=logging.DEBUG)
```

### Metrics History

Configure metrics retention in `monitoring_service.py`:

```python
# Default: 1000 records per endpoint
metrics = MetricsCollector(max_history=5000)  # Keep more history
```

### Log Rotation

Configure in `monitoring_service.py`:

```python
# Default: 10MB files with 5 backups
handler = LogRotationHandler(
    log_dir="logs",
    max_bytes=52428800,  # 50MB
    backup_count=10       # Keep 10 backups
)
```

---

## Common Queries

### Find errors by endpoint

```bash
curl -s http://localhost:8000/errors | jq '.errors[] | select(.endpoint=="/stt")'
```

### Get error rate trend

```powershell
$times = @()
for ($i = 1; $i -le 10; $i++) {
    $metrics = curl -s http://localhost:8000/metrics | ConvertFrom-Json
    $rate = ($metrics.total_errors / $metrics.total_requests) * 100
    $times += $rate
    Start-Sleep -Seconds 6
}
$times | Measure-Object -Average | Select-Object Average
```

### Monitor specific endpoint

```bash
watch -n 5 'curl -s http://localhost:8000/metrics | jq ".endpoints[\"/translate\"]"'
```

### Alert on high error rate

```powershell
while ($true) {
    $metrics = curl -s http://localhost:8000/metrics | ConvertFrom-Json
    $rate = ($metrics.total_errors / $metrics.total_requests) * 100
    
    if ($rate -gt 5) {
        Write-Host "ALERT: Error rate $rate% exceeds threshold!" -ForegroundColor Red
        # Send notification
    }
    
    Start-Sleep -Seconds 60
}
```

---

## Troubleshooting

### Metrics endpoints return 404

**Problem:** `/metrics`, `/errors`, `/rate-limits` endpoints not found

**Solution:** 
1. Verify monitoring endpoints are added to app.py
2. Check `metrics_collector` is initialized
3. Restart FastAPI service

### Logging directory permission denied

**Problem:** Cannot write to logs directory

**Solution:**
```powershell
# Create logs directory with proper permissions
New-Item -ItemType Directory "logs" -Force
# Or use relative path that exists
```

### High memory usage

**Problem:** Metrics collector growing too large

**Solution:**
1. Reduce `max_history` parameter in MetricsCollector
2. Decrease `cache_ttl` in MonitoringService.php
3. Increase log rotation frequency

### Stale metrics

**Problem:** Metrics not updating in real-time

**Solution:**
1. Check FastAPI service is running: `Get-Process python`
2. Verify middleware is registered in app.py
3. Clear browser cache if using web dashboard

---

## Best Practices

### 1. Regular Monitoring
- Check health endpoint daily: `curl http://localhost:8000/health`
- Review metrics weekly for trends
- Archive old logs monthly

### 2. Alert Response
- Set error rate alert at >5%
- Set response time alert at >2000ms (P95)
- Set auth failure alert at >10/hour
- Set rate limit alert at >20/hour

### 3. Performance Analysis
- Compare current metrics against baseline
- Identify slow endpoints early
- Track error patterns over time

### 4. Log Management
- Archive logs older than 30 days
- Search logs by timestamp for incidents
- Keep backup of critical error logs

---

## Integration with ADMINISTRATOR_GUIDE.md

Monitoring ties into existing admin procedures:

**Daily Operations:**
- Check `/health` endpoint (documented)
- Review error logs using monitoring endpoints
- Monitor response times via `/metrics`

**Monthly Tasks:**
- Generate performance reports from `/metrics`
- Analyze error trends using `/errors`
- Review security events from `/auth-failures` and `/rate-limits`

**Quarterly Tasks:**
- Audit all monitoring data for issues
- Plan capacity upgrades based on trends
- Review and adjust alert thresholds

---

## Next Phase

After monitoring setup, proceed to **Phase D3: Performance Tuning**

Performance tuning will include:
- Analyzing metrics from this monitoring setup
- Optimizing slow endpoints
- Database query optimization
- Caching strategies
- Load testing and benchmarking

---

**For support with monitoring implementation, contact the Digital Library AI team.**
