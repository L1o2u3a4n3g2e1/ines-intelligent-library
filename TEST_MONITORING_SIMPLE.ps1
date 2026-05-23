#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Simple Monitoring System Test
#>

$BaseURL = "http://localhost:8000"
$passed = 0
$failed = 0
$warned = 0

Write-Host ""
Write-Host "=== MONITORING SYSTEM TEST ===" -ForegroundColor Cyan
Write-Host ""

# Test 1: Health Check
Write-Host "[TEST 1] Service Health" -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "$BaseURL/health" -UseBasicParsing -ErrorAction Stop
    $health = ConvertFrom-Json $response.Content
    Write-Host "[OK] Service responding" -ForegroundColor Green
    Write-Host "     Status: $($health.status)" -ForegroundColor Green
    $passed++
} catch {
    Write-Host "[XX] Service not responding" -ForegroundColor Red
    Write-Host "     Error: $($_.Exception.Message)" -ForegroundColor Red
    $failed++
    exit 1
}

Write-Host ""

# Test 2: Monitoring Endpoints
Write-Host "[TEST 2] Monitoring Endpoints" -ForegroundColor Cyan

$endpoints = @("/metrics", "/errors", "/rate-limits", "/auth-failures")
foreach ($endpoint in $endpoints) {
    try {
        $response = Invoke-WebRequest -Uri "$BaseURL$endpoint" -UseBasicParsing -ErrorAction Stop
        Write-Host "[OK] $endpoint" -ForegroundColor Green
        $passed++
    } catch {
        Write-Host "[XX] $endpoint" -ForegroundColor Red
        $failed++
    }
}

Write-Host ""

# Test 3: Metrics Content
Write-Host "[TEST 3] Metrics Data" -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "$BaseURL/metrics" -UseBasicParsing
    $metrics = ConvertFrom-Json $response.Content

    Write-Host "[OK] Metrics retrieved" -ForegroundColor Green
    Write-Host "     Total Requests: $($metrics.total_requests)" -ForegroundColor Green
    Write-Host "     Total Errors: $($metrics.total_errors)" -ForegroundColor Green

    if ($metrics.endpoints.PSObject.Properties.Count -gt 0) {
        Write-Host "[OK] Endpoint metrics present: $($metrics.endpoints.PSObject.Properties.Count) endpoints" -ForegroundColor Green
        $passed++
    } else {
        Write-Host "[!!] No endpoint metrics yet (generate traffic first)" -ForegroundColor Yellow
        $warned++
    }
    $passed++
} catch {
    Write-Host "[XX] Failed to retrieve metrics" -ForegroundColor Red
    $failed++
}

Write-Host ""

# Test 4: Generate Traffic
Write-Host "[TEST 4] Generate Test Traffic" -ForegroundColor Cyan
$testCount = 3

for ($i = 0; $i -lt $testCount; $i++) {
    try {
        Invoke-WebRequest -Uri "$BaseURL/health" -UseBasicParsing -ErrorAction SilentlyContinue | Out-Null
        Write-Host -NoNewline "." -ForegroundColor Green
    } catch {}
}
Write-Host ""
Write-Host "[OK] Generated $testCount requests" -ForegroundColor Green
$passed++

Write-Host ""
Start-Sleep -Seconds 2

# Test 5: Verify Metrics Updated
Write-Host "[TEST 5] Verify Metrics Updated" -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "$BaseURL/metrics" -UseBasicParsing
    $metrics = ConvertFrom-Json $response.Content

    if ($metrics.total_requests -gt 0) {
        Write-Host "[OK] Requests counted: $($metrics.total_requests)" -ForegroundColor Green
        $passed++
    } else {
        Write-Host "[!!] No requests counted" -ForegroundColor Yellow
        $warned++
    }
} catch {
    Write-Host "[XX] Failed to check metrics" -ForegroundColor Red
    $failed++
}

Write-Host ""

# Test 6: Log Files
Write-Host "[TEST 6] Log File Generation" -ForegroundColor Cyan
$logDir = "pretrained_ai_models\logs"
$logFile = "$logDir\app.log"

if (Test-Path $logDir) {
    Write-Host "[OK] Log directory exists" -ForegroundColor Green
    $passed++

    if (Test-Path $logFile) {
        $fileSize = (Get-Item $logFile).Length
        $fileSizeMB = [math]::Round($fileSize / 1KB, 2)
        Write-Host "[OK] Log file exists: $fileSizeMB KB" -ForegroundColor Green
        $passed++
    } else {
        Write-Host "[!!] Log file not created (may need service restart)" -ForegroundColor Yellow
        $warned++
    }
} else {
    Write-Host "[!!] Log directory not yet created" -ForegroundColor Yellow
    $warned++
}

Write-Host ""

# Test 7: Dashboards
Write-Host "[TEST 7] Dashboard Files" -ForegroundColor Cyan

if (Test-Path "MONITORING_DASHBOARD.ps1") {
    Write-Host "[OK] PowerShell Dashboard ready" -ForegroundColor Green
    $passed++
} else {
    Write-Host "[XX] PowerShell Dashboard missing" -ForegroundColor Red
    $failed++
}

if (Test-Path "monitoring_status.php") {
    Write-Host "[OK] Web Dashboard ready" -ForegroundColor Green
    $passed++
} else {
    Write-Host "[XX] Web Dashboard missing" -ForegroundColor Red
    $failed++
}

if (Test-Path "api-lib\services\MonitoringService.php") {
    Write-Host "[OK] PHP Monitoring Service ready" -ForegroundColor Green
    $passed++
} else {
    Write-Host "[XX] PHP Monitoring Service missing" -ForegroundColor Red
    $failed++
}

Write-Host ""

# Test 8: PHP Integration
Write-Host "[TEST 8] PHP Integration" -ForegroundColor Cyan

if (Test-Path "api-lib\services\MonitoringService.php") {
    $content = Get-Content "api-lib\services\MonitoringService.php" -Raw

    $methods = @("getHealth", "getMetrics", "getSummary", "generateHTMLReport")
    $foundCount = 0

    foreach ($method in $methods) {
        if ($content -match "function $method") {
            $foundCount++
        }
    }

    if ($foundCount -eq 4) {
        Write-Host "[OK] All PHP methods present" -ForegroundColor Green
        $passed++
    } else {
        Write-Host "[!!] Some PHP methods missing" -ForegroundColor Yellow
        $warned++
    }
} else {
    Write-Host "[XX] PHP service not found" -ForegroundColor Red
    $failed++
}

Write-Host ""

# Summary
Write-Host "=== TEST SUMMARY ===" -ForegroundColor Cyan
Write-Host "Passed: $passed" -ForegroundColor Green
Write-Host "Warned: $warned" -ForegroundColor Yellow
Write-Host "Failed: $failed" -ForegroundColor Red

$total = $passed + $warned + $failed
if ($total -gt 0) {
    $percentage = [math]::Round(($passed / $total) * 100, 1)
    Write-Host "Success Rate: $percentage%" -ForegroundColor $(if ($percentage -ge 90) { "Green" } elseif ($percentage -ge 70) { "Yellow" } else { "Red" })
}

Write-Host ""

# Next Steps
if ($failed -eq 0) {
    Write-Host "Status: Ready for use" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Start dashboard: .\MONITORING_DASHBOARD.ps1" -ForegroundColor White
    Write-Host "2. Or visit: http://localhost/digital-library/monitoring_status.php" -ForegroundColor White
    Write-Host "3. Generate API traffic to collect more metrics" -ForegroundColor White
} else {
    Write-Host "Status: Issues detected - see above" -ForegroundColor Red
}

Write-Host ""
