$ErrorActionPreference = 'Stop'

$checks = @(
    @{ Name = 'Frontend'; Url = 'http://127.0.0.1:3000/login' },
    @{ Name = 'Backend'; Url = 'http://localhost/digital-library/backend/health' },
    @{ Name = 'Open-vocabulary STT'; Url = 'http://127.0.0.1:5001/health' },
    @{ Name = 'Transformer STT'; Url = 'http://127.0.0.1:5006/health' },
    @{ Name = 'SpeechT5 TTS service'; Url = 'http://127.0.0.1:5007/health' }
)

function Test-PortListener([int]$Port) {
    $pattern = "^\s*TCP\s+\S+:$Port\s+\S+\s+LISTENING\s+\d+"
    return [bool](netstat -ano -p tcp | Select-String -Pattern $pattern | Select-Object -First 1)
}

foreach ($check in $checks) {
    try {
        $response = Invoke-WebRequest -Uri $check.Url -UseBasicParsing -TimeoutSec 5
        [pscustomobject]@{ Service = $check.Name; Status = 'PASS'; HttpStatus = $response.StatusCode; Url = $check.Url }
    } catch {
        [pscustomobject]@{ Service = $check.Name; Status = 'FAIL'; HttpStatus = ''; Url = $check.Url }
    }
}

try {
    $backendHealth = Invoke-RestMethod -Uri 'http://localhost/digital-library/backend/health' -TimeoutSec 30
    $ttsReady = $backendHealth.data.tts -and (
        ($backendHealth.data.tts.service -and $backendHealth.data.tts.service.success) -or
        ($backendHealth.data.tts.primary -and $backendHealth.data.tts.primary.success)
    )
    [pscustomobject]@{
        Service = 'SpeechT5 TTS preload'
        Status = $(if ($ttsReady) { 'PASS' } else { 'FAIL' })
        HttpStatus = ''
        Url = 'backend /health data.tts.primary'
    }
} catch {
    [pscustomobject]@{ Service = 'SpeechT5 TTS preload'; Status = 'FAIL'; HttpStatus = ''; Url = 'backend /health data.tts.primary' }
}

$ports = 80, 3000, 3306, 5001, 5006, 5007
foreach ($port in $ports) {
    $listening = Test-PortListener $port
    [pscustomobject]@{ Service = "Port $port"; Status = $(if ($listening) { 'PASS' } else { 'FAIL' }); HttpStatus = ''; Url = '' }
}
