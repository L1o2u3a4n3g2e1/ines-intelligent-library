$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$python = 'C:\Users\Anne Louange\AppData\Local\Programs\Python\Python311\python.exe'
$existing = Get-CimInstance Win32_Process |
    Where-Object {
        $_.Name -match '^python(w)?\.exe$' -and
        $_.CommandLine -like '*train_wav2vec2_lstm_adapter.py*'
    }

if ($existing) {
    throw "Wav2Vec2-LSTM adapter training is already running as PID $($existing.ProcessId)."
}

$output = Join-Path $root 'training_logs\wav2vec2_lstm_four_day.out.log'
$errorLog = Join-Path $root 'training_logs\wav2vec2_lstm_four_day.err.log'
$arguments = @(
    '-u',
    'scripts\train_wav2vec2_lstm_adapter.py',
    '--epochs', '100',
    '--batch-size', '8',
    '--max-train', '3000',
    '--eval-samples', '240',
    '--max-duration', '12',
    '--max-text-length', '120',
    '--hidden-size', '192',
    '--layers', '2',
    '--adapter-lr', '0.001',
    '--head-lr', '0.00001',
    '--minimum-epochs', '10',
    '--early-stop-patience', '10',
    '--max-runtime-hours', '96',
    '--num-threads', '2',
    '--resume'
)

$process = Start-Process `
    -FilePath $python `
    -ArgumentList $arguments `
    -WorkingDirectory $root `
    -WindowStyle Hidden `
    -RedirectStandardOutput $output `
    -RedirectStandardError $errorLog `
    -PassThru

Start-Sleep -Seconds 2
$running = Get-Process -Id $process.Id
$running.PriorityClass = 'BelowNormal'

[pscustomobject]@{
    Status = 'STARTED'
    ProcessId = $process.Id
    StartedAt = $running.StartTime
    MaximumRuntimeHours = 96
    OutputLog = $output
    ErrorLog = $errorLog
}
