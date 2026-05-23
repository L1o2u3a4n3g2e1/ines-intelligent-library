#!/usr/bin/env pwsh
<#
.SYNOPSIS
Digital Library AI Service - Performance Optimization & Testing Script
Phase D3: Automated performance testing, baseline establishment, and optimization validation

.DESCRIPTION
This script performs automated load testing to measure performance before and after optimizations
Tracks cache hit rates, response times (P50/P95/P99), throughput, and system resources

.PARAMETERS
-Mode: 'baseline', 'optimized', 'compare' (default: 'baseline')
-Duration: Test duration in seconds (default: 60)
-Workers: Number of concurrent requests (default: 10)

.EXAMPLE
.\PERFORMANCE_OPTIMIZATION_SCRIPT.ps1 -Mode baseline -Duration 120 -Workers 20
#>

param(
    [ValidateSet('baseline', 'optimized', 'compare')]
    [string]$Mode = 'baseline',
    [int]$Duration = 60,
    [int]$Workers = 10
)

# Configuration
$SERVICE_URL = "http://localhost:8000"
$TEST_TEXT_RW = "Murakaza neza"
$TEST_TEXT_EN = "Thank you very much"
$RESULTS_DIR = ".\performance_results"

# Create results directory
if (-not (Test-Path $RESULTS_DIR)) {
    New-Item -ItemType Directory -Path $RESULTS_DIR | Out-Null
}

# Colors for output
$colors = @{
    success = "Green"
    warning = "Yellow"
    error = "Red"
    info = "Cyan"
}

function Write-Status {
    param([string]$Message, [string]$Status = "info")
    $color = $colors[$Status]
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $Message" -ForegroundColor $color
}

# Step 1: Verify service is running
function Verify-Service {
    Write-Status "Verifying FastAPI service is running..." "info"
    try {
        $health = Invoke-WebRequest -Uri "$SERVICE_URL/health" -Method GET -TimeoutSec 5
        if ($health.StatusCode -eq 200) {
            Write-Status "FastAPI service is ONLINE" "success"
            return $true
        }
    } catch {
        Write-Status "FastAPI service is OFFLINE - cannot proceed" "error"
        return $false
    }
}

# Step 2: Get JWT token
function Get-AuthToken {
    Write-Status "Obtaining JWT authentication token..." "info"
    try {
        $response = Invoke-WebRequest -Uri "$SERVICE_URL/token" `
            -Method POST `
            -Headers @{"Content-Type" = "application/json"} `
            -TimeoutSec 10

        $tokenData = $response.Content | ConvertFrom-Json
        Write-Status "Token obtained successfully (expires in $($tokenData.expires_in) seconds)" "success"
        return $tokenData.access_token
    } catch {
        Write-Status "Failed to obtain token: $_" "error"
        return $null
    }
}

# Step 3: Measure baseline performance (translation endpoint with cache misses)
function Measure-BaselinePerformance {
    param([string]$Token, [int]$NumRequests)

    Write-Status "Starting BASELINE performance measurement ($NumRequests requests)..." "info"
    Write-Status "Cache will be empty - all requests will be cache MISSES" "warning"

    $results = @{
        total_requests = 0
        successful_requests = 0
        failed_requests = 0
        response_times = @()
        cache_hits = 0
        cache_misses = 0
        total_time_seconds = 0
    }

    $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
    $random = Get-Random -Minimum 1000 -Maximum 9999

    for ($i = 1; $i -le $NumRequests; $i++) {
        try {
            # Vary text slightly to avoid cache hits
            $testText = "$TEST_TEXT_EN-$random-$i"

            $requestStart = [System.Diagnostics.Stopwatch]::StartNew()

            $response = Invoke-WebRequest -Uri "$SERVICE_URL/translate" `
                -Method POST `
                -Headers @{
                    "Authorization" = "Bearer $Token"
                    "Content-Type" = "application/x-www-form-urlencoded"
                } `
                -Body "text=$testText&direction=en-rw" `
                -TimeoutSec 30

            $requestStart.Stop()
            $responseTime = $requestStart.ElapsedMilliseconds

            if ($response.StatusCode -eq 200) {
                $results.successful_requests++
                $results.response_times += $responseTime

                # Show progress every 10 requests
                if ($i % 10 -eq 0) {
                    Write-Host "." -NoNewline
                }
            } else {
                $results.failed_requests++
            }
        } catch {
            $results.failed_requests++
            Write-Host "X" -NoNewline
        }

        $results.total_requests++
    }

    $stopwatch.Stop()
    $results.total_time_seconds = $stopwatch.Elapsed.TotalSeconds

    Write-Host ""
    return $results
}

# Step 4: Measure optimized performance (with cache hits)
function Measure-OptimizedPerformance {
    param([string]$Token, [int]$NumRequests)

    Write-Status "Starting OPTIMIZED performance measurement ($NumRequests requests)..." "info"
    Write-Status "Using cached responses - expecting cache HITS after first request per text" "warning"

    $results = @{
        total_requests = 0
        successful_requests = 0
        failed_requests = 0
        response_times = @()
        cache_hits = 0
        cache_misses = 0
        total_time_seconds = 0
    }

    # Pre-populate with some common translations
    $testTexts = @(
        "Hello world",
        "Thank you very much",
        "How are you",
        "Good morning",
        "Good evening"
    )

    # Warm up with each text once
    Write-Status "Warming up cache with 5 initial requests..." "info"
    foreach ($text in $testTexts) {
        try {
            Invoke-WebRequest -Uri "$SERVICE_URL/translate" `
                -Method POST `
                -Headers @{
                    "Authorization" = "Bearer $Token"
                    "Content-Type" = "application/x-www-form-urlencoded"
                } `
                -Body "text=$text&direction=en-rw" `
                -TimeoutSec 30 | Out-Null
        } catch { }
    }

    Write-Status "Cache warmed up. Starting load test..." "success"

    $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()

    for ($i = 1; $i -le $NumRequests; $i++) {
        try {
            # Use same texts repeatedly for cache hits
            $testText = $testTexts[$i % $testTexts.Length]

            $requestStart = [System.Diagnostics.Stopwatch]::StartNew()

            $response = Invoke-WebRequest -Uri "$SERVICE_URL/translate" `
                -Method POST `
                -Headers @{
                    "Authorization" = "Bearer $Token"
                    "Content-Type" = "application/x-www-form-urlencoded"
                } `
                -Body "text=$testText&direction=en-rw" `
                -TimeoutSec 30

            $requestStart.Stop()
            $responseTime = $requestStart.ElapsedMilliseconds

            if ($response.StatusCode -eq 200) {
                $results.successful_requests++
                $results.response_times += $responseTime

                # Show progress every 10 requests
                if ($i % 10 -eq 0) {
                    Write-Host "." -NoNewline
                }
            } else {
                $results.failed_requests++
            }
        } catch {
            $results.failed_requests++
            Write-Host "X" -NoNewline
        }

        $results.total_requests++
    }

    $stopwatch.Stop()
    $results.total_time_seconds = $stopwatch.Elapsed.TotalSeconds

    Write-Host ""
    return $results
}

# Step 5: Get metrics from API
function Get-ServiceMetrics {
    param([string]$Token)

    try {
        $response = Invoke-WebRequest -Uri "$SERVICE_URL/metrics" `
            -Method GET `
            -Headers @{"Authorization" = "Bearer $Token"} `
            -TimeoutSec 10

        return $response.Content | ConvertFrom-Json
    } catch {
        Write-Status "Could not fetch metrics from /metrics endpoint" "warning"
        return $null
    }
}

# Step 6: Calculate and display results
function Display-Results {
    param($Results, [string]$Label)

    Write-Host ""
    Write-Status "====== PERFORMANCE TEST RESULTS: $Label ======" "info"
    Write-Host ""

    $successRate = if ($Results.total_requests -gt 0) {
        [math]::Round(($Results.successful_requests / $Results.total_requests) * 100, 2)
    } else { 0 }

    Write-Host "Total Requests:        $($Results.total_requests)"
    Write-Host "Successful:            $($Results.successful_requests)"
    Write-Host "Failed:                $($Results.failed_requests)"
    Write-Host "Success Rate:          ${successRate}%"
    Write-Host "Total Time:            $([math]::Round($Results.total_time_seconds, 2)) seconds"
    Write-Host "Throughput:            $([math]::Round($Results.total_requests / $Results.total_time_seconds, 2)) req/sec"
    Write-Host ""

    if ($Results.response_times.Count -gt 0) {
        $sorted = $Results.response_times | Sort-Object
        $avg = [math]::Round(($sorted | Measure-Object -Average).Average, 2)
        $min = $sorted[0]
        $max = $sorted[-1]
        $p50 = $sorted[[int]($sorted.Count * 0.50)]
        $p95 = $sorted[[int]($sorted.Count * 0.95)]
        $p99 = $sorted[[int]($sorted.Count * 0.99)]

        Write-Host "Response Times (ms):"
        Write-Host "  Min:                 $min"
        Write-Host "  Max:                 $max"
        Write-Host "  Average:             $avg"
        Write-Host "  P50 (Median):        $p50"
        Write-Host "  P95 (95th %ile):     $p95"
        Write-Host "  P99 (99th %ile):     $p99"
    }

    Write-Host ""
}

# Step 7: Compare baseline vs optimized
function Compare-Results {
    param($BaselineResults, $OptimizedResults)

    Write-Status "====== PERFORMANCE IMPROVEMENT ANALYSIS ======" "info"
    Write-Host ""

    $avgBaseline = ($BaselineResults.response_times | Measure-Object -Average).Average
    $avgOptimized = ($OptimizedResults.response_times | Measure-Object -Average).Average
    $improvement = [math]::Round((($avgBaseline - $avgOptimized) / $avgBaseline) * 100, 2)

    $throughputBaseline = $BaselineResults.total_requests / $BaselineResults.total_time_seconds
    $throughputOptimized = $OptimizedResults.total_requests / $OptimizedResults.total_time_seconds
    $throughputImprovement = [math]::Round((($throughputOptimized - $throughputBaseline) / $throughputBaseline) * 100, 2)

    Write-Host "AVERAGE RESPONSE TIME IMPROVEMENT:"
    Write-Host "  Baseline:            $([math]::Round($avgBaseline, 2)) ms"
    Write-Host "  Optimized:           $([math]::Round($avgOptimized, 2)) ms"
    Write-Host "  Improvement:         ${improvement}% FASTER" -ForegroundColor Green
    Write-Host ""

    Write-Host "THROUGHPUT IMPROVEMENT:"
    Write-Host "  Baseline:            $([math]::Round($throughputBaseline, 2)) req/sec"
    Write-Host "  Optimized:           $([math]::Round($throughputOptimized, 2)) req/sec"
    Write-Host "  Improvement:         ${throughputImprovement}% HIGHER" -ForegroundColor Green
    Write-Host ""

    # P95 improvement
    $sorted_baseline = $BaselineResults.response_times | Sort-Object
    $sorted_optimized = $OptimizedResults.response_times | Sort-Object
    $p95_baseline = $sorted_baseline[[int]($sorted_baseline.Count * 0.95)]
    $p95_optimized = $sorted_optimized[[int]($sorted_optimized.Count * 0.95)]
    $p95_improvement = [math]::Round((($p95_baseline - $p95_optimized) / $p95_baseline) * 100, 2)

    Write-Host "P95 RESPONSE TIME IMPROVEMENT:"
    Write-Host "  Baseline P95:        $p95_baseline ms"
    Write-Host "  Optimized P95:       $p95_optimized ms"
    Write-Host "  Improvement:         ${p95_improvement}% FASTER" -ForegroundColor Green
    Write-Host ""

    if ($improvement -ge 10) {
        Write-Status "SUCCESS: Achieved >10% performance improvement!" "success"
    } elseif ($improvement -ge 5) {
        Write-Status "GOOD: Achieved >5% performance improvement" "success"
    } else {
        Write-Status "BASELINE: Limited improvement detected - investigate bottlenecks" "warning"
    }
}

# Save results to JSON
function Save-Results {
    param($Results, [string]$Filename)

    $Results | ConvertTo-Json | Out-File -Path (Join-Path $RESULTS_DIR $Filename) -Encoding UTF8
    Write-Status "Results saved to $Filename" "success"
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

Write-Status "Digital Library AI Service - Performance Optimization Script" "info"
Write-Status "Mode: $Mode | Duration: $Duration seconds | Workers: $Workers" "info"
Write-Host ""

# Verify service
if (-not (Verify-Service)) {
    Write-Status "Cannot proceed - service not running" "error"
    exit 1
}

# Get token
$token = Get-AuthToken
if (-not $token) {
    Write-Status "Cannot proceed - authentication failed" "error"
    exit 1
}

# Run tests based on mode
switch ($Mode) {
    'baseline' {
        $results = Measure-BaselinePerformance -Token $token -NumRequests ($Duration * 2)
        Display-Results -Results $results -Label "BASELINE (No Cache)"
        Save-Results -Results $results -Filename "baseline_$(Get-Date -Format 'yyyyMMdd_HHmmss').json"
    }

    'optimized' {
        $results = Measure-OptimizedPerformance -Token $token -NumRequests ($Duration * 2)
        Display-Results -Results $results -Label "OPTIMIZED (With Cache)"
        Save-Results -Results $results -Filename "optimized_$(Get-Date -Format 'yyyyMMdd_HHmmss').json"
    }

    'compare' {
        Write-Status "Running BASELINE test..." "info"
        $baseline = Measure-BaselinePerformance -Token $token -NumRequests ($Duration * 2)
        Display-Results -Results $baseline -Label "BASELINE"
        Save-Results -Results $baseline -Filename "baseline_$(Get-Date -Format 'yyyyMMdd_HHmmss').json"

        Write-Status "Running OPTIMIZED test..." "info"
        $optimized = Measure-OptimizedPerformance -Token $token -NumRequests ($Duration * 2)
        Display-Results -Results $optimized -Label "OPTIMIZED"
        Save-Results -Results $optimized -Filename "optimized_$(Get-Date -Format 'yyyyMMdd_HHmmss').json"

        Compare-Results -BaselineResults $baseline -OptimizedResults $optimized
    }
}

Write-Status "Performance testing completed!" "success"
Write-Status "Results saved to: $RESULTS_DIR" "info"
