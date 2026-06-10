$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$python = 'C:\Users\Anne Louange\AppData\Local\Programs\Python\Python311\python.exe'
$logDirectory = Join-Path $root 'logs'
New-Item -ItemType Directory -Force -Path $logDirectory | Out-Null

$services = @(
    @{
        Name = 'Open-vocabulary STT'
        Port = 5001
        Script = 'scripts\whisper_stt_service.py'
        Output = 'whisper-stt.out.log'
        Error = 'whisper-stt.err.log'
    },
    @{
        Name = 'Python AI Backend'
        Port = 5003
        Script = 'backend\python\main.py'
        Output = 'python-ai-backend.out.log'
        Error = 'python-ai-backend.err.log'
    },
    @{
        Name = 'Transformer STT'
        Port = 5006
        Script = 'scripts\transformer_speech_service.py'
        Output = 'transformer-stt.out.log'
        Error = 'transformer-stt.err.log'
    }
)

foreach ($service in $services) {
    $listener = Get-NetTCPConnection -State Listen -LocalPort $service.Port -ErrorAction SilentlyContinue
    if (!$listener) {
        $process = Start-Process `
            -FilePath $python `
            -ArgumentList $service.Script `
            -WorkingDirectory $root `
            -WindowStyle Hidden `
            -RedirectStandardOutput (Join-Path $logDirectory $service.Output) `
            -RedirectStandardError (Join-Path $logDirectory $service.Error) `
            -PassThru
        [pscustomobject]@{ Service = $service.Name; Status = 'STARTED'; ProcessId = $process.Id; Port = $service.Port }
    } else {
        [pscustomobject]@{ Service = $service.Name; Status = 'RUNNING'; ProcessId = $listener.OwningProcess; Port = $service.Port }
    }
}
