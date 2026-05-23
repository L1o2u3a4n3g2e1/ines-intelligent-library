#!/usr/bin/env pwsh
<#
.SYNOPSIS
Start Digital Library AI Service with Automatically Optimized Worker Configuration

.DESCRIPTION
Detects system specs and recommends/starts service with optimal worker count
- Analyzes CPU cores and available RAM
- Calculates recommended worker count
- Starts uvicorn with optimizations enabled
- Monitors service health

.EXAMPLE
.\START_OPTIMIZED_SERVICE.ps1
.\START_OPTIMIZED_SERVICE.ps1 -Workers 4 -Verbose
#>

param(
    [int]$Workers = 0,  # 0 = auto-detect
    [switch]$DryRun,
    [switch]$Verbose
)

# Configuration
$SERVICE_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
$SERVICE_NAME = "Digital Library AI Service"
$SERVICE_PORT = 8000
$SERVICE_HOST = "127.0.0.1"

# FFmpeg path
$FFMPEG_PATH = "C:\Users\Anne Louange\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.1.1-full_build\bin"

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

function Write-Header {
    param([string]$Message)
    Write-Host ""
    Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║ $($Message.PadRight(58)) ║" -ForegroundColor Cyan
    Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
}

function Write-Section {
    param([string]$Message)
    Write-Host ""
    Write-Host "▶ $Message" -ForegroundColor Yellow
}

function Write-Success {
    param([string]$Message)
    Write-Host "  [OK] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "  [!!] $Message" -ForegroundColor Yellow
}

function Write-Error-Custom {
    param([string]$Message)
    Write-Host "  [XX] $Message" -ForegroundColor Red
}

# Detect system specifications
function Get-SystemSpecs {
    Write-Section "Detecting system specifications..."

    $specs = @{}

    # CPU cores
    try {
        $cpuInfo = Get-CimInstance Win32_Processor
        $specs.CpuCores = $cpuInfo.NumberOfCores
        Write-Success "CPU Cores: $($specs.CpuCores)"
    } catch {
        Write-Error-Custom "Could not detect CPU cores"
        $specs.CpuCores = 2
    }

    # Available RAM
    try {
        $osInfo = Get-CimInstance Win32_OperatingSystem
        $specs.TotalRamGB = [math]::Round($osInfo.TotalVisibleMemorySize / 1MB, 2)
        $specs.FreeRamGB = [math]::Round($osInfo.FreePhysicalMemory / 1MB, 2)
        Write-Success "Total RAM: $($specs.TotalRamGB) GB"
        Write-Success "Free RAM: $($specs.FreeRamGB) GB"
    } catch {
        Write-Error-Custom "Could not detect RAM"
        $specs.TotalRamGB = 4
        $specs.FreeRamGB = 2
    }

    return $specs
}

# Calculate optimal worker count
function Get-OptimalWorkerCount {
    param($Specs)

    Write-Section "Calculating optimal worker count..."

    # Formula: (CPU cores * 2) + 1
    $recommendedFromCores = ($Specs.CpuCores * 2) + 1
    Write-Host "  Based on CPU cores: ($($Specs.CpuCores) × 2) + 1 = $recommendedFromCores workers"

    # Memory constraint: ~500MB per worker
    $memoryPerWorker = 0.5  # GB
    $maxFromMemory = [math]::Floor($Specs.FreeRamGB / $memoryPerWorker)
    Write-Host "  Based on available RAM: $($Specs.FreeRamGB)GB ÷ $($memoryPerWorker)GB = $maxFromMemory workers"

    # Take minimum to stay safe
    $optimal = [math]::Min($recommendedFromCores, $maxFromMemory)

    # Hard limits
    if ($optimal -lt 1) { $optimal = 1 }
    if ($optimal -gt 32) { $optimal = 32 }

    Write-Success "Recommended worker count: $optimal"

    # Show confidence
    if ($Specs.FreeRamGB -lt 2) {
        Write-Warning "Low available RAM - recommend conservative: 2 workers"
        return 2
    } elseif ($Specs.FreeRamGB -lt 4) {
        Write-Success "Moderate RAM - will use: 4 workers"
        return 4
    } else {
        Write-Success "Sufficient RAM - will use: $optimal workers"
        return $optimal
    }
}

# Verify service is not already running
function Check-ServiceNotRunning {
    Write-Section "Checking if service is already running..."

    $existingProcess = Get-Process python -ErrorAction SilentlyContinue |
                       Where-Object { $_.CommandLine -like "*uvicorn*" }

    if ($existingProcess) {
        Write-Error-Custom "FastAPI service already running (PID: $($existingProcess.Id))"
        Write-Host "  Please stop it first: Stop-Process -Id $($existingProcess.Id) -Force"
        return $false
    }

    Write-Success "Service not currently running"
    return $true
}

# Verify FFmpeg is available
function Check-FFmpeg {
    Write-Section "Checking FFmpeg availability..."

    $ffmpegExe = Join-Path $FFMPEG_PATH "ffmpeg.exe"
    if (Test-Path $ffmpegExe) {
        Write-Success "FFmpeg found at: $FFMPEG_PATH"
        return $true
    } else {
        Write-Warning "FFmpeg not found at expected path"
        Write-Warning "STT (Speech-to-Text) will not work without FFmpeg"
        return $false
    }
}

# Verify .env file exists
function Check-EnvFile {
    Write-Section "Checking configuration..."

    $envFile = Join-Path $SERVICE_DIR ".env"
    if (Test-Path $envFile) {
        Write-Success ".env configuration file found"
        return $true
    } else {
        Write-Warning ".env file not found - using defaults"
        Write-Warning "Some features may not work correctly"
        return $false
    }
}

# Start the service
function Start-Service {
    param(
        [int]$WorkerCount,
        [switch]$DryRun,
        [switch]$Verbose
    )

    Write-Header "Starting Service"

    Write-Host ""
    Write-Host "Service Configuration:" -ForegroundColor Cyan
    Write-Host "  Host: $SERVICE_HOST"
    Write-Host "  Port: $SERVICE_PORT"
    Write-Host "  Workers: $WorkerCount"
    Write-Host "  Log Level: $(if ($Verbose) {'debug'} else {'info'})"
    Write-Host ""

    # Set environment variables
    $env:PYTHONUNBUFFERED = "1"
    $env:PATH = "$FFMPEG_PATH;" + $env:PATH

    # Build command
    $logLevel = if ($Verbose) { "debug" } else { "info" }
    $command = "python -m uvicorn app:app " +
        "--host $SERVICE_HOST " +
        "--port $SERVICE_PORT " +
        "--workers $WorkerCount " +
        "--log-level $logLevel"

    Write-Host "Command:" -ForegroundColor Yellow
    Write-Host "  $command" -ForegroundColor Gray
    Write-Host ""

    if ($DryRun) {
        Write-Warning "DRY RUN - not starting service"
        return
    }

    Write-Host "Starting service..." -ForegroundColor Green
    Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "═" * 60

    # Start service
    Set-Location $SERVICE_DIR
    & python -m uvicorn app:app `
        --host $SERVICE_HOST `
        --port $SERVICE_PORT `
        --workers $WorkerCount `
        --log-level $logLevel
}

# Health check
function Verify-ServiceRunning {
    Write-Section "Verifying service is running..."

    $maxAttempts = 5
    $attempt = 0

    while ($attempt -lt $maxAttempts) {
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:8000/health" `
                -Method GET `
                -TimeoutSec 2

            if ($response.StatusCode -eq 200) {
                Write-Success "Service is responding to health checks"
                return $true
            }
        } catch {
            $attempt++
            if ($attempt -lt $maxAttempts) {
                Write-Host "  Attempt $attempt/$maxAttempts - waiting..." -ForegroundColor Gray
                Start-Sleep -Seconds 1
            }
        }
    }

    Write-Warning "Service not responding after $maxAttempts attempts"
    Write-Warning "Check console output above for errors"
    return $false
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

Clear-Host
Write-Header "$SERVICE_NAME - Optimized Startup"

# Step 1: Detect system specs
$specs = Get-SystemSpecs

# Step 2: Check prerequisites
if (-not (Check-ServiceNotRunning)) {
    exit 1
}

Check-FFmpeg | Out-Null
Check-EnvFile | Out-Null

# Step 3: Calculate or use specified worker count
if ($Workers -eq 0) {
    $Workers = Get-OptimalWorkerCount -Specs $specs
} else {
    Write-Section "Using specified worker count: $Workers"
}

# Step 4: Show summary
Write-Host ""
Write-Host "Ready to start with configuration:" -ForegroundColor Cyan
Write-Host "  Workers: $Workers (optimized for $($specs.CpuCores) CPU cores, $($specs.FreeRamGB)GB RAM)"
Write-Host ""

if ($DryRun) {
    Write-Host "DRY RUN MODE - showing what would be executed" -ForegroundColor Yellow
}

# Step 5: Start service
Start-Service -WorkerCount $Workers -DryRun:$DryRun -Verbose:$Verbose

# Step 6: Post-startup health check (if not dry run)
if (-not $DryRun) {
    Write-Host ""
    Write-Host "Waiting for service to start..." -ForegroundColor Yellow
    Start-Sleep -Seconds 3
    Verify-ServiceRunning | Out-Null
}
