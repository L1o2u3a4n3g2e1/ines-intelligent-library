$ErrorActionPreference = 'Stop'

$checks = @(
    @{ Name = 'Frontend'; Url = 'http://127.0.0.1:3000/login' },
    @{ Name = 'Backend'; Url = 'http://localhost/digital-library/backend/health' },
    @{ Name = 'Open-vocabulary STT'; Url = 'http://127.0.0.1:5001/health' },
    @{ Name = 'Python AI Backend'; Url = 'http://127.0.0.1:5003/health' },
    @{ Name = 'Transformer STT'; Url = 'http://127.0.0.1:5006/health' },
    @{ Name = 'Open-vocabulary LSTM-CTC'; Url = 'http://127.0.0.1:5004/health' },
    @{ Name = 'Wav2Vec2-LSTM adapter'; Url = 'http://127.0.0.1:5005/health' }
)

foreach ($check in $checks) {
    try {
        $response = Invoke-WebRequest -Uri $check.Url -UseBasicParsing -TimeoutSec 5
        [pscustomobject]@{ Service = $check.Name; Status = 'PASS'; HttpStatus = $response.StatusCode; Url = $check.Url }
    } catch {
        [pscustomobject]@{ Service = $check.Name; Status = 'FAIL'; HttpStatus = ''; Url = $check.Url }
    }
}

$ports = 80, 3000, 3306, 5001, 5003, 5004, 5005, 5006
$listeners = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue
foreach ($port in $ports) {
    $listening = $listeners | Where-Object LocalPort -eq $port
    [pscustomobject]@{ Service = "Port $port"; Status = $(if ($listening) { 'PASS' } else { 'FAIL' }); HttpStatus = ''; Url = '' }
}
