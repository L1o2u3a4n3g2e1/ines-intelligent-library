$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$xamppRoot = if ($env:XAMPP_ROOT) { $env:XAMPP_ROOT } else { 'C:\xampp' }
$vite = Join-Path $root 'node_modules\.bin\vite.cmd'
$EnableWhisperFallbackStt = $true
$EnableTransformerStt = $true
$EnableSpeechT5Tts = $true
$flags = Join-Path $PSScriptRoot 'speech_service_flags.ps1'
if (Test-Path -LiteralPath $flags) {
    . $flags
}

function Get-PortListener([int]$Port) {
    $pattern = "^\s*TCP\s+\S+:$Port\s+\S+\s+LISTENING\s+\d+"
    return netstat -ano -p tcp | Select-String -Pattern $pattern | Select-Object -First 1
}

function Wait-ForPort([string]$Name, [int]$Port, [int]$TimeoutSeconds) {
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    do {
        if (Get-PortListener $Port) {
            Write-Host "[ready] $Name on port $Port" -ForegroundColor Green
            return
        }
        Start-Sleep -Milliseconds 500
    } while ((Get-Date) -lt $deadline)

    throw "$Name did not start on port $Port within $TimeoutSeconds seconds."
}

function Start-XamppService([string]$Name, [int]$Port, [string]$StarterName, [int]$TimeoutSeconds = 60) {
    if (Get-PortListener $Port) {
        Write-Host "[ready] $Name already running on port $Port" -ForegroundColor Green
        return
    }

    $starter = Join-Path $xamppRoot $StarterName
    if (-not (Test-Path -LiteralPath $starter)) {
        throw "$Name starter was not found at $starter."
    }

    Write-Host "[start] $Name" -ForegroundColor Cyan
    Start-Process -FilePath 'cmd.exe' `
        -ArgumentList @('/d', '/s', '/c', "`"$starter`"") `
        -WorkingDirectory $xamppRoot `
        -WindowStyle Hidden
    Wait-ForPort $Name $Port $TimeoutSeconds
}

Set-Location $root

if (-not (Test-Path -LiteralPath $vite)) {
    throw 'Frontend dependencies are missing. Run npm install, then npm run dev.'
}

Write-Host ''
Write-Host 'INES Digital Library development system' -ForegroundColor Cyan
Write-Host '---------------------------------------'

Start-XamppService 'Apache' 80 'apache_start.bat' 120
Start-XamppService 'MySQL' 3306 'mysql_start.bat'

Write-Host '[start] Speech services' -ForegroundColor Cyan
& (Join-Path $PSScriptRoot 'start_ai_services.ps1') | Format-Table -AutoSize
if ($EnableWhisperFallbackStt) { Wait-ForPort 'Whisper fallback STT' 5001 120 } else { Write-Host '[skip] Whisper fallback STT disabled' -ForegroundColor Yellow }
if ($EnableTransformerStt) { Wait-ForPort 'Wav2Vec2 Transformer STT' 5006 120 } else { Write-Host '[skip] Wav2Vec2 Transformer STT disabled' -ForegroundColor Yellow }
if ($EnableSpeechT5Tts) { Wait-ForPort 'SpeechT5 TTS service' 5007 180 } else { Write-Host '[skip] SpeechT5 TTS disabled' -ForegroundColor Yellow }

$backend = Invoke-RestMethod -Uri 'http://localhost/digital-library/backend/health' -TimeoutSec 10
$backendStatus = if ($backend.data -and $backend.data.status) { $backend.data.status } else { '' }
if ($backend.data.database -ne 'connected' -or -not $backend.data.uploads_writable) {
    throw 'The PHP backend is not healthy. Check Apache and MySQL.'
}
Write-Host '[ready] PHP backend, database, and uploads' -ForegroundColor Green

if ($EnableSpeechT5Tts) {
    $ttsReady = $backend.data.tts -and (
        ($backend.data.tts.service -and $backend.data.tts.service.success) -or
        ($backend.data.tts.primary -and $backend.data.tts.primary.success)
    )
    if (-not $ttsReady) {
        throw 'SpeechT5 is not preloaded according to backend health. Run scripts/start_ai_services.ps1 and check the SpeechT5 output.'
    }
    Write-Host '[ready] SpeechT5 TTS preload verified by backend health' -ForegroundColor Green
} else {
    Write-Host '[skip] SpeechT5 TTS preload check disabled' -ForegroundColor Yellow
}

Write-Host ''
Write-Host 'Application: http://127.0.0.1:3000' -ForegroundColor Yellow
Write-Host 'Press Ctrl+C to stop the Vite development server.'
Write-Host ''

if (Get-PortListener 3000) {
    try {
        Invoke-WebRequest -Uri 'http://127.0.0.1:3000/login' -UseBasicParsing -TimeoutSec 5 | Out-Null
        Write-Host '[ready] Vite frontend already running on http://127.0.0.1:3000' -ForegroundColor Green
        return
    } catch {
        throw 'Port 3000 is already in use, but the frontend did not respond at /login. Stop the process using port 3000, then run npm run dev again.'
    }
}

& $vite --host 127.0.0.1 --port 3000 --strictPort
