$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$xamppRoot = if ($env:XAMPP_ROOT) { $env:XAMPP_ROOT } else { 'C:\xampp' }
$vite = Join-Path $root 'node_modules\.bin\vite.cmd'

function Get-PortListener([int]$Port) {
    return Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue |
        Select-Object -First 1
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

function Start-XamppService([string]$Name, [int]$Port, [string]$StarterName) {
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
    Wait-ForPort $Name $Port 45
}

Set-Location $root

if (-not (Test-Path -LiteralPath $vite)) {
    throw 'Frontend dependencies are missing. Run npm install, then npm run dev.'
}

Write-Host ''
Write-Host 'INES Digital Library development system' -ForegroundColor Cyan
Write-Host '---------------------------------------'

Start-XamppService 'Apache' 80 'apache_start.bat'
Start-XamppService 'MySQL' 3306 'mysql_start.bat'

Write-Host '[start] Speech services' -ForegroundColor Cyan
& (Join-Path $PSScriptRoot 'start_ai_services.ps1') | Format-Table -AutoSize
Wait-ForPort 'Whisper fallback STT' 5001 120
Wait-ForPort 'Wav2Vec2 Transformer STT' 5006 120

$backend = Invoke-RestMethod -Uri 'http://localhost/digital-library/backend/health' -TimeoutSec 10
$backendStatus = if ($backend.data -and $backend.data.status) { $backend.data.status } else { '' }
if ($backendStatus -ne 'ok') {
    throw 'The PHP backend is not healthy. Check Apache and MySQL.'
}
Write-Host '[ready] PHP backend and database' -ForegroundColor Green

Write-Host ''
Write-Host 'Application: http://127.0.0.1:3000' -ForegroundColor Yellow
Write-Host 'Press Ctrl+C to stop the Vite development server.'
Write-Host ''

& $vite --host 127.0.0.1 --port 3000
