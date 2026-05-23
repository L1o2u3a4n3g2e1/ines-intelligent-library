#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Real-time Monitoring Dashboard for Digital Library AI Service

.DESCRIPTION
    Displays live metrics, health status, and performance data in the PowerShell console.
    Refreshes every 30 seconds with color-coded indicators.

.PARAMETER Interval
    Refresh interval in seconds (default: 30)

.PARAMETER BaseURL
    Service base URL (default: http://localhost:8000)

.EXAMPLE
    .\MONITORING_DASHBOARD.ps1
    .\MONITORING_DASHBOARD.ps1 -Interval 10 -BaseURL "http://localhost:8000"
#>

param(
    [int]$Interval = 30,
    [string]$BaseURL = "http://localhost:8000"
)

function Clear-ScreenSafe {
    # Clear screen safely on Windows
    if ($PSVersionTable.OS -like "Windows*") {
        cmd /c cls
    } else {
        clear
    }
}

function Format-MetricValue {
    param(
        [string]$Value,
        [string]$Unit = ""
    )

    if ($Value -match "^\d+(\.\d+)?$") {
        return "{0:F2}{1}" -f [double]$Value, $Unit
    }
    return $Value
}

function Get-StatusColor {
    param([string]$Status)

    switch ($Status) {
        "ready" { return "Green" }
        "degraded" { return "Yellow" }
        "warming" { return "Cyan" }
        default { return "Red" }
    }
}

function Get-ErrorRateColor {
    param([double]$ErrorRate)

    if ($ErrorRate -lt 0.5) { return "Green" }
    if ($ErrorRate -lt 1.0) { return "Yellow" }
    if ($ErrorRate -lt 5.0) { return "Magenta" }
    return "Red"
}

function Get-ResponseTimeColor {
    param([double]$ResponseTime)

    if ($ResponseTime -lt 500) { return "Green" }
    if ($ResponseTime -lt 2000) { return "Yellow" }
    if ($ResponseTime -lt 5000) { return "Magenta" }
    return "Red"
}

function Format-Uptime {
    param([int]$Seconds)

    $timespan = [timespan]::FromSeconds($Seconds)

    if ($timespan.TotalHours -ge 24) {
        return "{0}d {1:D2}h {2:D2}m" -f $timespan.Days, $timespan.Hours, $timespan.Minutes
    } elseif ($timespan.TotalHours -ge 1) {
        return "{0:D2}h {1:D2}m {2:D2}s" -f $timespan.Hours, $timespan.Minutes, $timespan.Seconds
    } else {
        return "{0:D2}m {1:D2}s" -f $timespan.Minutes, $timespan.Seconds
    }
}

function Show-Dashboard {
    param(
        [hashtable]$HealthData,
        [hashtable]$MetricsData,
        [array]$RecentErrors,
        [int]$RefreshCount
    )

    Clear-ScreenSafe

    Write-Host ""
    Write-Host "╔════════════════════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║          Digital Library AI Service - Real-time Monitoring Dashboard           ║" -ForegroundColor Cyan
    Write-Host "╚════════════════════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

    Write-Host ""
    Write-Host "Refresh #$RefreshCount at $(Get-Date -Format 'HH:mm:ss') | Interval: ${Interval}s" -ForegroundColor Gray

    # Service Status Section
    Write-Host ""
    Write-Host "┌─ SERVICE STATUS " -ForegroundColor Cyan
    $statusColor = Get-StatusColor $HealthData.status
    Write-Host "│ Status: " -NoNewline -ForegroundColor Cyan
    Write-Host $HealthData.status.ToUpper() -ForegroundColor $statusColor -NoNewline
    Write-Host " | Device: $($HealthData.device)" -ForegroundColor White
    Write-Host "│ Uptime: $(Format-Uptime $MetricsData.uptime_seconds)" -ForegroundColor Cyan
    Write-Host "└─────────────────────────────────────────────────────────" -ForegroundColor Cyan

    # Model Status
    Write-Host ""
    Write-Host "┌─ MODEL STATUS " -ForegroundColor Cyan
    foreach ($model in $HealthData.models.PSObject.Properties) {
        $modelStatus = $model.Value
        $modelColor = if ($modelStatus -eq "loaded") { "Green" } else { "Red" }
        Write-Host "│ $($model.Name.PadRight(12)): " -NoNewline -ForegroundColor Cyan
        Write-Host $modelStatus -ForegroundColor $modelColor
    }
    Write-Host "└─────────────────────────────────────────────────────────" -ForegroundColor Cyan

    # Overall Metrics
    Write-Host ""
    Write-Host "┌─ OVERALL METRICS " -ForegroundColor Cyan

    $totalReqs = $MetricsData.total_requests
    $totalErrors = $MetricsData.total_errors
    $errorRate = if ($totalReqs -gt 0) { ($totalErrors / $totalReqs) * 100 } else { 0 }

    Write-Host "│ Total Requests: " -NoNewline -ForegroundColor Cyan
    Write-Host $totalReqs.ToString().PadLeft(6) -ForegroundColor White -NoNewline
    Write-Host " | Errors: " -ForegroundColor Cyan -NoNewline
    Write-Host $totalErrors.ToString().PadLeft(4) -ForegroundColor Red -NoNewline

    $errColor = Get-ErrorRateColor $errorRate
    Write-Host " | Error Rate: " -ForegroundColor Cyan -NoNewline
    Write-Host ("{0:F2}%" -f $errorRate).PadLeft(7) -ForegroundColor $errColor

    Write-Host "│ Rate Limits Hit: " -NoNewline -ForegroundColor Cyan
    Write-Host $MetricsData.total_rate_limits.ToString().PadLeft(4) -ForegroundColor $(if($MetricsData.total_rate_limits -gt 0) { "Yellow" } else { "Green" }) -NoNewline
    Write-Host " | Auth Failures: " -ForegroundColor Cyan -NoNewline
    Write-Host $MetricsData.auth_failures.ToString().PadLeft(4) -ForegroundColor $(if($MetricsData.auth_failures -gt 0) { "Yellow" } else { "Green" })

    Write-Host "└─────────────────────────────────────────────────────────" -ForegroundColor Cyan

    # Per-Endpoint Metrics
    Write-Host ""
    Write-Host "┌─ ENDPOINT PERFORMANCE " -ForegroundColor Cyan
    Write-Host "│ Endpoint         │ Requests │ Errors │ Avg Time │ P95 Time │ Error%" -ForegroundColor Cyan
    Write-Host "├──────────────────┼──────────┼────────┼──────────┼──────────┼────────" -ForegroundColor Cyan

    foreach ($endpoint in $MetricsData.endpoints.PSObject.Properties) {
        $ep = $endpoint.Value
        $epName = $endpoint.Name.PadRight(16)
        $requests = [int]$ep.total_requests
        $errors = [int]$ep.error_count
        $avgTime = [double]($ep.avg_response_time_ms -replace "ms", "")
        $p95Time = [double]($ep.p95_response_time_ms -replace "ms", "")
        $errorPct = if ($requests -gt 0) { ($errors / $requests) * 100 } else { 0 }

        $timeColor = Get-ResponseTimeColor $avgTime
        $errColor = Get-ErrorRateColor $errorPct

        Write-Host "│ $epName │ " -NoNewline -ForegroundColor Cyan
        Write-Host $requests.ToString().PadLeft(8) -ForegroundColor White -NoNewline
        Write-Host " │ " -ForegroundColor Cyan -NoNewline
        Write-Host $errors.ToString().PadLeft(6) -ForegroundColor $(if($errors -gt 0) { "Yellow" } else { "Green" }) -NoNewline
        Write-Host " │ " -ForegroundColor Cyan -NoNewline
        Write-Host ("{0:F0}ms" -f $avgTime).PadLeft(8) -ForegroundColor $timeColor -NoNewline
        Write-Host " │ " -ForegroundColor Cyan -NoNewline
        Write-Host ("{0:F0}ms" -f $p95Time).PadLeft(8) -ForegroundColor $(Get-ResponseTimeColor $p95Time) -NoNewline
        Write-Host " │ " -ForegroundColor Cyan -NoNewline
        Write-Host ("{0:F1}%" -f $errorPct).PadLeft(6) -ForegroundColor $errColor
    }
    Write-Host "└──────────────────┴──────────┴────────┴──────────┴──────────┴────────" -ForegroundColor Cyan

    # Recent Errors
    if ($RecentErrors -and @($RecentErrors).Count -gt 0) {
        Write-Host ""
        Write-Host "┌─ RECENT ERRORS (Last 5) " -ForegroundColor Cyan

        $errorList = @($RecentErrors) | Select-Object -First 5 | ForEach-Object {
            $time = $_.timestamp -split 'T' | Select-Object -Last 1 -ErrorAction SilentlyContinue
            if (-not $time) { $time = $_.timestamp }
            "$($_.endpoint) - $($_.type)"
        }

        foreach ($error in $errorList) {
            Write-Host "│ $error" -ForegroundColor Yellow
        }
        Write-Host "└─────────────────────────────────────────────────────────" -ForegroundColor Cyan
    }

    # Footer
    Write-Host ""
    Write-Host "Press Ctrl+C to stop monitoring. Next refresh in $($Interval)s..." -ForegroundColor Gray
}

function Get-DashboardData {
    param([string]$BaseURL)

    try {
        Write-Host "Fetching data..." -ForegroundColor Gray -NoNewline

        $health = Invoke-WebRequest -Uri "$BaseURL/health" -UseBasicParsing | ConvertFrom-Json
        $metrics = Invoke-WebRequest -Uri "$BaseURL/metrics" -UseBasicParsing | ConvertFrom-Json
        $errors = (Invoke-WebRequest -Uri "$BaseURL/errors?limit=5" -UseBasicParsing | ConvertFrom-Json).errors

        Write-Host "`r`s" -ForegroundColor Green

        return @{
            Health = $health
            Metrics = $metrics
            Errors = $errors
            Success = $true
        }
    } catch {
        Write-Host "`r✗ Connection failed" -ForegroundColor Red
        return @{
            Success = $false
            Error = $_.Exception.Message
        }
    }
}

# Main monitoring loop
$refreshCount = 0

try {
    while ($true) {
        $refreshCount++
        $data = Get-DashboardData -BaseURL $BaseURL

        if ($data.Success) {
            Show-Dashboard -HealthData $data.Health `
                          -MetricsData $data.Metrics `
                          -RecentErrors $data.Errors `
                          -RefreshCount $refreshCount
        } else {
            Clear-ScreenSafe
            Write-Host ""
            Write-Host "╔════════════════════════════════════════════════════════════════════════════════╗" -ForegroundColor Red
            Write-Host "║                         CONNECTION ERROR                                      ║" -ForegroundColor Red
            Write-Host "╚════════════════════════════════════════════════════════════════════════════════╝" -ForegroundColor Red
            Write-Host ""
            Write-Host "Error: $($data.Error)" -ForegroundColor Red
            Write-Host ""
            Write-Host "Service may be down or unreachable at: $BaseURL" -ForegroundColor Yellow
            Write-Host "Retrying in $Interval seconds..." -ForegroundColor Gray
            Write-Host ""
        }

        Start-Sleep -Seconds $Interval
    }
} catch [System.Management.Automation.PipelineStoppedException] {
    Write-Host ""
    Write-Host ""
    Write-Host "Monitoring stopped." -ForegroundColor Green
    exit 0
} catch {
    Write-Host "Fatal error: $_" -ForegroundColor Red
    exit 1
}
