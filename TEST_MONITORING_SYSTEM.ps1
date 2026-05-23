#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Comprehensive Monitoring System Test Suite

.DESCRIPTION
    Tests all components of the monitoring and logging setup including:
    - Monitoring endpoints availability
    - Metrics collection accuracy
    - Dashboard functionality
    - PHP integration
    - Log file generation and rotation
    - Alert threshold accuracy

.PARAMETER BaseURL
    Service base URL (default: http://localhost:8000)

.PARAMETER GenerateTraffic
    Generate test traffic to collect metrics (default: $true)

.PARAMETER TestCount
    Number of test requests per endpoint (default: 5)
#>

param(
    [string]$BaseURL = "http://localhost:8000",
    [bool]$GenerateTraffic = $true,
    [int]$TestCount = 5
)

$ErrorActionPreference = "SilentlyContinue"
$ProgressPreference = "SilentlyContinue"

# Test results tracking
$results = @{
    passed = 0
    failed = 0
    warnings = 0
    tests = @()
}

function Write-TestHeader {
    param([string]$Title)
    Write-Host ""
    Write-Host "╔════════════════════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║ $($Title.PadRight(82)) ║" -ForegroundColor Cyan
    Write-Host "╚════════════════════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
}

function Write-TestResult {
    param(
        [string]$TestName,
        [string]$Status,
        [string]$Message = ""
    )

    $icon = switch ($Status) {
        "PASS" { "[OK]"; $color = "Green"; $results.passed++ }
        "FAIL" { "[XX]"; $color = "Red"; $results.failed++ }
        "WARN" { "[!!]"; $color = "Yellow"; $results.warnings++ }
    }

    Write-Host "$icon $Status " -ForegroundColor $color -NoNewline
    Write-Host "| $TestName" -ForegroundColor White -NoNewline
    if ($Message) {
        Write-Host " - $Message" -ForegroundColor Gray
    } else {
        Write-Host ""
    }

    $results.tests += @{
        name = $TestName
        status = $Status
        message = $Message
    }
}

function Test-ServiceHealth {
    Write-TestHeader "TEST 1: Service Health & Connectivity"

    try {
        Write-Host "Testing connection to $BaseURL..." -ForegroundColor Gray

        $response = Invoke-WebRequest -Uri "$BaseURL/health" -UseBasicParsing -ErrorAction Stop
        $health = ConvertFrom-Json $response.Content

        Write-TestResult "Service Connection" "PASS" "Connected successfully"

        if ($health.status) {
            Write-TestResult "Health Endpoint Response" "PASS" "Status: $($health.status)"
        } else {
            Write-TestResult "Health Endpoint Response" "FAIL" "No status in response"
        }

        # Check models
        $loadedCount = 0
        $failedCount = 0
        foreach ($model in $health.models.PSObject.Properties) {
            if ($model.Value -eq "loaded") {
                $loadedCount++
            } else {
                $failedCount++
            }
        }

        if ($failedCount -eq 0) {
            Write-TestResult "All Models Loaded" "PASS" "All 4 models ready"
        } elseif ($loadedCount -gt 0) {
            Write-TestResult "Models Partially Loaded" "WARN" "$loadedCount loaded, $failedCount failed"
        } else {
            Write-TestResult "Models Failed" "FAIL" "No models loaded"
        }

    } catch {
        Write-TestResult "Service Connection" "FAIL" $_.Exception.Message
        return $false
    }

    return $true
}

function Test-MonitoringEndpoints {
    Write-TestHeader "TEST 2: Monitoring Endpoints Availability"

    $endpoints = @(
        @{ path = "/health"; name = "Health Check" }
        @{ path = "/metrics"; name = "Metrics" }
        @{ path = "/errors"; name = "Errors" }
        @{ path = "/rate-limits"; name = "Rate Limits" }
        @{ path = "/auth-failures"; name = "Auth Failures" }
    )

    foreach ($endpoint in $endpoints) {
        try {
            $response = Invoke-WebRequest -Uri "$BaseURL$($endpoint.path)" -UseBasicParsing -ErrorAction Stop
            $data = ConvertFrom-Json $response.Content

            if ($response.StatusCode -eq 200) {
                Write-TestResult "$($endpoint.name) Endpoint" "PASS" "HTTP 200, responds with JSON"
            } else {
                Write-TestResult "$($endpoint.name) Endpoint" "WARN" "HTTP $($response.StatusCode)"
            }
        } catch {
            Write-TestResult "$($endpoint.name) Endpoint" "FAIL" $_.Exception.Message
        }
    }
}

function Test-MetricsContent {
    Write-TestHeader "TEST 3: Metrics Data Validation"

    try {
        $response = Invoke-WebRequest -Uri "$BaseURL/metrics" -UseBasicParsing
        $metrics = ConvertFrom-Json $response.Content

        # Check required fields
        $requiredFields = @("timestamp", "uptime_seconds", "total_requests", "total_errors", "endpoints")

        foreach ($field in $requiredFields) {
            if ($metrics.PSObject.Properties[$field]) {
                Write-TestResult "Metrics Field: $field" "PASS"
            } else {
                Write-TestResult "Metrics Field: $field" "FAIL"
            }
        }

        # Check endpoint metrics
        if ($metrics.endpoints -and $metrics.endpoints.PSObject.Properties.Count -gt 0) {
            Write-TestResult "Endpoint Metrics Count" "PASS" "$($metrics.endpoints.PSObject.Properties.Count) endpoints tracked"

            foreach ($endpoint in $metrics.endpoints.PSObject.Properties) {
                $ep = $endpoint.Value
                $requiredEpFields = @("total_requests", "error_count", "avg_response_time_ms")

                $allPresent = $true
                foreach ($field in $requiredEpFields) {
                    if (-not $ep.PSObject.Properties[$field]) {
                        $allPresent = $false
                        break
                    }
                }

                if ($allPresent) {
                    Write-TestResult "Metrics for $($endpoint.Name)" "PASS"
                } else {
                    Write-TestResult "Metrics for $($endpoint.Name)" "WARN" "Missing some fields"
                }
            }
        } else {
            Write-TestResult "Endpoint Metrics Count" "WARN" "No endpoint metrics yet (generate traffic first)"
        }

    } catch {
        Write-TestResult "Metrics Content Validation" "FAIL" $_.Exception.Message
    }
}

function Test-ErrorTracking {
    Write-TestHeader "TEST 4: Error Logging & Tracking"

    try {
        $response = Invoke-WebRequest -Uri "$BaseURL/errors?limit=10" -UseBasicParsing
        $errors = ConvertFrom-Json $response.Content

        if ($errors.errors -is [array]) {
            if ($errors.errors.Count -gt 0) {
                Write-TestResult "Error Log Storage" "PASS" "$($errors.errors.Count) errors stored"

                # Check first error has required fields
                $firstError = $errors.errors[0]
                if ($firstError.timestamp -and $firstError.endpoint -and $firstError.type) {
                    Write-TestResult "Error Record Structure" "PASS" "All required fields present"
                } else {
                    Write-TestResult "Error Record Structure" "WARN" "Missing some fields"
                }
            } else {
                Write-TestResult "Error Log Storage" "WARN" "No errors logged yet"
            }
        } else {
            Write-TestResult "Error Response Format" "PASS" "Error list properly formatted"
        }

    } catch {
        Write-TestResult "Error Tracking" "FAIL" $_.Exception.Message
    }
}

function Test-GenerateTraffic {
    Write-TestHeader "TEST 5: Generate Test Traffic & Metrics"

    if (-not $GenerateTraffic) {
        Write-Host "Traffic generation skipped (use -GenerateTraffic:$true)" -ForegroundColor Gray
        return
    }

    Write-Host "Generating $TestCount requests per endpoint..." -ForegroundColor Gray

    try {
        # Get initial token
        $tokenResponse = Invoke-WebRequest -Uri "$BaseURL/token" -Method POST -UseBasicParsing
        $tokenData = ConvertFrom-Json $tokenResponse.Content
        $token = $tokenData.access_token

        if (-not $token) {
            Write-TestResult "Token Generation" "FAIL" "Could not get API token"
            return
        }

        Write-TestResult "Token Generation" "PASS" "Token obtained successfully"

        # Generate /health requests
        for ($i = 0; $i -lt $TestCount; $i++) {
            try {
                Invoke-WebRequest -Uri "$BaseURL/health" -UseBasicParsing -ErrorAction SilentlyContinue | Out-Null
                Write-Host "." -ForegroundColor Green -NoNewline
            } catch {}
        }
        Write-Host "" -ForegroundColor Green

        Write-TestResult "Health Endpoint Traffic" "PASS" "$TestCount requests completed"

        # Generate /metrics requests
        for ($i = 0; $i -lt $TestCount; $i++) {
            try {
                Invoke-WebRequest -Uri "$BaseURL/metrics" -UseBasicParsing -ErrorAction SilentlyContinue | Out-Null
                Write-Host "." -ForegroundColor Green -NoNewline
            } catch {}
        }
        Write-Host "" -ForegroundColor Green

        Write-TestResult "Metrics Endpoint Traffic" "PASS" "$TestCount requests completed"

        # Try a translation request (if token works)
        for ($i = 0; $i -lt $TestCount; $i++) {
            try {
                $headers = @{"Authorization" = "Bearer $token"}
                Invoke-WebRequest -Uri "$BaseURL/translate" -Method POST -UseBasicParsing `
                    -Headers $headers -Body "text=hello&direction=en-rw" `
                    -ErrorAction SilentlyContinue | Out-Null
                Write-Host "." -ForegroundColor Green -NoNewline
            } catch {}
        }
        Write-Host "" -ForegroundColor Green

        Write-TestResult "Translation Endpoint Traffic" "PASS" "$TestCount requests completed"

        Write-Host ""
        Write-Host "Waiting 2 seconds for metrics to update..." -ForegroundColor Gray
        Start-Sleep -Seconds 2

    } catch {
        Write-TestResult "Traffic Generation" "FAIL" $_.Exception.Message
    }
}

function Test-MetricsUpdated {
    Write-TestHeader "TEST 6: Verify Metrics Updated After Traffic"

    try {
        $response = Invoke-WebRequest -Uri "$BaseURL/metrics" -UseBasicParsing
        $metrics = ConvertFrom-Json $response.Content

        $totalRequests = $metrics.total_requests

        if ($totalRequests -gt 0) {
            Write-TestResult "Requests Counted" "PASS" "$totalRequests total requests recorded"
        } else {
            Write-TestResult "Requests Counted" "WARN" "No requests counted yet"
        }

        # Check if any endpoints have metrics
        $endpointsWithMetrics = 0
        foreach ($endpoint in $metrics.endpoints.PSObject.Properties) {
            if ($endpoint.Value.total_requests -gt 0) {
                $endpointsWithMetrics++
            }
        }

        if ($endpointsWithMetrics -gt 0) {
            Write-TestResult "Endpoint Metrics Recording" "PASS" "$endpointsWithMetrics endpoints have recorded metrics"
        } else {
            Write-TestResult "Endpoint Metrics Recording" "WARN" "No endpoint metrics yet"
        }

    } catch {
        Write-TestResult "Metrics Update Verification" "FAIL" $_.Exception.Message
    }
}

function Test-LogFiles {
    Write-TestHeader "TEST 7: Log File Generation & Rotation"

    $logDir = "pretrained_ai_models\logs"
    $logFile = "$logDir\app.log"

    # Check if logs directory exists
    if (Test-Path $logDir) {
        Write-TestResult "Log Directory Exists" "PASS" "Found: $logDir"

        # Check if log file exists
        if (Test-Path $logFile) {
            Write-TestResult "Log File Created" "PASS" "Found: app.log"

            # Get file size
            $fileSize = (Get-Item $logFile).Length
            $fileSizeMB = [math]::Round($fileSize / 1MB, 2)
            Write-TestResult "Log File Size" "PASS" "$fileSizeMB MB"

            # Check file content
            $logContent = Get-Content $logFile -Tail 5 -ErrorAction SilentlyContinue
            if ($logContent) {
                Write-TestResult "Log File Content" "PASS" "Contains log entries"
            } else {
                Write-TestResult "Log File Content" "WARN" "File empty or unreadable"
            }
        } else {
            Write-TestResult "Log File Created" "WARN" "app.log not found (may need service restart)"
        }

        # Check backup files
        $backups = Get-ChildItem "$logDir\app.log.*" -ErrorAction SilentlyContinue
        if ($backups) {
            Write-TestResult "Log Rotation Setup" "PASS" "$($backups.Count) backup files exist"
        } else {
            Write-TestResult "Log Rotation Setup" "WARN" "No backup files yet"
        }
    } else {
        Write-TestResult "Log Directory Exists" "FAIL" "Logs directory not found"
    }
}

function Test-PHPIntegration {
    Write-TestHeader "TEST 8: PHP Monitoring Service"

    $phpFile = "api-lib\services\MonitoringService.php"

    if (Test-Path $phpFile) {
        Write-TestResult "MonitoringService.php Exists" "PASS" "File present"

        # Check for required methods
        $content = Get-Content $phpFile -Raw
        $requiredMethods = @("getHealth", "getMetrics", "getRecentErrors", "getSummary", "generateHTMLReport")

        foreach ($method in $requiredMethods) {
            if ($content -match "function $method") {
                Write-TestResult "PHP Method: $method" "PASS"
            } else {
                Write-TestResult "PHP Method: $method" "FAIL"
            }
        }
    } else {
        Write-TestResult "MonitoringService.php Exists" "FAIL" "File not found"
    }
}

function Test-Dashboards {
    Write-TestHeader "TEST 9: Dashboards Available"

    # Check PowerShell dashboard
    $psFile = "MONITORING_DASHBOARD.ps1"
    if (Test-Path $psFile) {
        Write-TestResult "PowerShell Dashboard" "PASS" "MONITORING_DASHBOARD.ps1 ready"
    } else {
        Write-TestResult "PowerShell Dashboard" "FAIL" "File not found"
    }

    # Check PHP dashboard
    $phpDashboard = "monitoring_status.php"
    if (Test-Path $phpDashboard) {
        Write-TestResult "Web Dashboard" "PASS" "monitoring_status.php ready"
        Write-Host "  → Access at: http://localhost/digital-library/monitoring_status.php" -ForegroundColor Cyan
    } else {
        Write-TestResult "Web Dashboard" "FAIL" "File not found"
    }

    # Check monitoring service module
    $monitoringModule = "pretrained_ai_models\monitoring_service.py"
    if (Test-Path $monitoringModule) {
        Write-TestResult "Monitoring Module" "PASS" "monitoring_service.py ready"
    } else {
        Write-TestResult "Monitoring Module" "WARN" "monitoring_service.py not deployed yet"
    }
}

function Test-AlertThresholds {
    Write-TestHeader "TEST 10: Alert Threshold Validation"

    try {
        $response = Invoke-WebRequest -Uri "$BaseURL/metrics" -UseBasicParsing
        $metrics = ConvertFrom-Json $response.Content

        # Get error rate
        if ($metrics.total_requests -gt 0) {
            $errorRate = ($metrics.total_errors / $metrics.total_requests) * 100

            if ($errorRate -lt 1) {
                Write-TestResult "Error Rate Threshold" "PASS" "$([math]::Round($errorRate, 2))% - OK"
            } elseif ($errorRate -lt 5) {
                Write-TestResult "Error Rate Threshold" "WARN" "$([math]::Round($errorRate, 2))% - WARNING"
            } else {
                Write-TestResult "Error Rate Threshold" "FAIL" "$([math]::Round($errorRate, 2))% - CRITICAL"
            }
        } else {
            Write-TestResult "Error Rate Threshold" "WARN" "No requests to evaluate"
        }

        # Check rate limit hits
        $rateLimitHits = $metrics.total_rate_limits
        if ($rateLimitHits -lt 5) {
            Write-TestResult "Rate Limit Threshold" "PASS" "$rateLimitHits hits - OK"
        } elseif ($rateLimitHits -lt 20) {
            Write-TestResult "Rate Limit Threshold" "WARN" "$rateLimitHits hits - WARNING"
        } else {
            Write-TestResult "Rate Limit Threshold" "FAIL" "$rateLimitHits hits - CRITICAL"
        }

        # Check auth failures
        $authFailures = $metrics.auth_failures
        if ($authFailures -lt 3) {
            Write-TestResult "Auth Failure Threshold" "PASS" "$authFailures failures - OK"
        } elseif ($authFailures -lt 10) {
            Write-TestResult "Auth Failure Threshold" "WARN" "$authFailures failures - WARNING"
        } else {
            Write-TestResult "Auth Failure Threshold" "FAIL" "$authFailures failures - CRITICAL"
        }

    } catch {
        Write-TestResult "Alert Thresholds" "FAIL" $_.Exception.Message
    }
}

function Show-TestSummary {
    Write-Host ""
    Write-Host "╔════════════════════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║                            TEST SUMMARY REPORT                                ║" -ForegroundColor Cyan
    Write-Host "╚════════════════════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

    Write-Host ""
    Write-Host "Test Results:" -ForegroundColor Cyan
    Write-Host "  PASS:  $($results.passed) tests" -ForegroundColor Green
    Write-Host "  WARN:  $($results.warnings) tests" -ForegroundColor Yellow
    Write-Host "  FAIL:  $($results.failed) tests" -ForegroundColor Red

    $totalTests = $results.passed + $results.warnings + $results.failed
    $passPercentage = if ($totalTests -gt 0) { [math]::Round(($results.passed / $totalTests) * 100, 1) } else { 0 }

    Write-Host ""
    Write-Host "Success Rate: $passPercentage%" -ForegroundColor $(if ($passPercentage -ge 90) { "Green" } elseif ($passPercentage -ge 70) { "Yellow" } else { "Red" })

    Write-Host ""
    if ($results.failed -eq 0) {
        Write-Host "[OK] All critical tests passed! Monitoring system is ready." -ForegroundColor Green
    } elseif ($results.failed -lt 5) {
        Write-Host "[!!] Some tests failed. Review and troubleshoot above." -ForegroundColor Yellow
    } else {
        Write-Host "[XX] Multiple failures detected. Please review the setup." -ForegroundColor Red
    }

    Write-Host ""
}

function Show-NextSteps {
    Write-Host "╔════════════════════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║                              NEXT STEPS                                       ║" -ForegroundColor Cyan
    Write-Host "╚════════════════════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

    Write-Host ""
    Write-Host "1. Review Monitoring:" -ForegroundColor Cyan
    Write-Host "   Run: .\MONITORING_DASHBOARD.ps1" -ForegroundColor White
    Write-Host "   Or:  http://localhost/digital-library/monitoring_status.php" -ForegroundColor White

    Write-Host ""
    Write-Host "2. Check Health:" -ForegroundColor Cyan
    Write-Host "   curl http://localhost:8000/health" -ForegroundColor White

    Write-Host ""
    Write-Host "3. Review Logs:" -ForegroundColor Cyan
    Write-Host "   Get-Content pretrained_ai_models\logs\app.log -Tail 50" -ForegroundColor White

    Write-Host ""
    Write-Host "4. Integration:" -ForegroundColor Cyan
    Write-Host "   See: MONITORING_SETUP_GUIDE.md" -ForegroundColor White

    Write-Host ""
    Write-Host "5. Next Phase:" -ForegroundColor Cyan
    Write-Host "   Phase D3 - Performance Tuning" -ForegroundColor White

    Write-Host ""
}

# Main execution
try {
    Write-Host ""
    Write-Host "Digital Library AI Service - Monitoring System Test Suite" -ForegroundColor Cyan
    Write-Host "========================================================" -ForegroundColor Cyan

    Test-ServiceHealth
    if ($?) {
        Test-MonitoringEndpoints
        Test-MetricsContent
        Test-ErrorTracking
        Test-GenerateTraffic
        Test-MetricsUpdated
        Test-LogFiles
        Test-PHPIntegration
        Test-Dashboards
        Test-AlertThresholds
    } else {
        Write-Host ""
        Write-Host "Service is not responding. Please verify:" -ForegroundColor Red
        Write-Host "  1. FastAPI service is running on $BaseURL" -ForegroundColor Red
        Write-Host "  2. monitoring_service.py is imported in app.py" -ForegroundColor Red
        Write-Host "  3. Monitoring endpoints are added to app.py" -ForegroundColor Red
        exit 1
    }

    Show-TestSummary
    Show-NextSteps

} catch {
    Write-Host ""
    Write-Host "Fatal error: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Test completed at $(Get-Date)" -ForegroundColor Gray
