$root = Split-Path -Parent $PSScriptRoot
$process = Get-CimInstance Win32_Process |
    Where-Object {
        $_.Name -match '^python(w)?\.exe$' -and
        $_.CommandLine -like '*train_wav2vec2_lstm_adapter.py*'
    } |
    Select-Object -First 1

$sessionPath = Join-Path $root 'training_logs\wav2vec2_lstm_adapter_session.json'
$progressPath = Join-Path $root 'logs\wav2vec2_lstm_adapter_progress.jsonl'
$metricsPath = Join-Path $root 'models\stt\wav2vec2_lstm_adapter_metrics.json'
$outputPath = Join-Path $root 'training_logs\wav2vec2_lstm_four_day.out.log'

$session = if (Test-Path $sessionPath) {
    Get-Content $sessionPath -Raw | ConvertFrom-Json
} else {
    $null
}
$progress = if (Test-Path $progressPath) {
    Get-Content $progressPath -Tail 1 | ConvertFrom-Json
} else {
    $null
}
$metrics = if (Test-Path $metricsPath) {
    Get-Content $metricsPath -Raw | ConvertFrom-Json
} else {
    $null
}
$recentOutput = if (Test-Path $outputPath) {
    (Get-Content $outputPath -Tail 1)
} else {
    $null
}
if (!$progress -and $recentOutput) {
    try {
        $progress = $recentOutput | ConvertFrom-Json
    } catch {
        $progress = $null
    }
}
$progressPercent = if ($progress.total -and $progress.processed) {
    [math]::Round((100 * [double]$progress.processed / [double]$progress.total), 2)
} else {
    $null
}
$estimatedStageRemainingMinutes = if (
    $progress.elapsed_seconds -and
    $progress.processed -and
    $progress.total -and
    [double]$progress.processed -gt 0
) {
    $secondsPerItem = [double]$progress.elapsed_seconds / [double]$progress.processed
    [math]::Round(($secondsPerItem * ([double]$progress.total - [double]$progress.processed)) / 60, 1)
} else {
    $null
}

[pscustomobject]@{
    Running = [bool]$process
    ProcessId = if ($process) { $process.ProcessId } else { $null }
    StartedAt = if ($session.started_at) { $session.started_at } elseif ($process) { $process.CreationDate } else { $null }
    Stage = $progress.stage
    Split = $progress.split
    Processed = $progress.processed
    Total = $progress.total
    ProgressPercent = $progressPercent
    EstimatedStageRemainingMinutes = $estimatedStageRemainingMinutes
    Epoch = $progress.epoch
    Step = $progress.step
    TotalSteps = $progress.total_steps
    RecentLoss = $progress.loss
    AdapterGate = $progress.gate
    BestAdapterEpoch = $metrics.adapter_trained_epochs
    WordAccuracyPercent = $metrics.overall_word_accuracy_percent
    SentenceExactAccuracyPercent = $metrics.overall_sentence_exact_accuracy_percent
    ProductionReady = $metrics.production_ready
    RecentOutput = $recentOutput
}
