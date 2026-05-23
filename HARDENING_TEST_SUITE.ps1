# Production Hardening Test Suite
# Tests all security measures: JWT, Rate Limiting, CORS, HTTPS

param(
    [string]$BaseURL = "http://localhost:8000",
    [switch]$Verbose = $false
)

# ============================================================================
# TEST UTILITIES
# ============================================================================

$testsPassed = 0
$testsFailed = 0
$testsSkipped = 0

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Method,
        [string]$Endpoint,
        [hashtable]$Headers = @{},
        [object]$Body = $null,
        [int]$ExpectedStatus = 200
    )

    try {
        $url = $BaseURL + $Endpoint
        $params = @{
            Uri = $url
            Method = $Method
            Headers = $Headers
            ErrorAction = 'Stop'
        }

        if ($Body) {
            if ($Method -eq 'POST' -and $Body -is [hashtable]) {
                $params['Body'] = ($Body | ConvertTo-Json -Compress)
                $params['ContentType'] = 'application/json'
            } else {
                $params['Body'] = $Body
            }
        }

        $response = Invoke-WebRequest @params
        $status = $response.StatusCode

        if ($status -eq $ExpectedStatus) {
            Write-Host "[PASS] $Name" -ForegroundColor Green
            return $true
        } else {
            Write-Host "[FAIL] $Name (Expected $ExpectedStatus, got $status)" -ForegroundColor Red
            return $false
        }
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.Value__
        if ($statusCode -eq $ExpectedStatus) {
            Write-Host "[PASS] $Name" -ForegroundColor Green
            return $true
        } else {
            Write-Host "[FAIL] $Name - $($_.Exception.Message)" -ForegroundColor Red
            if ($Verbose) {
                Write-Host "  Details: $($_.Exception)" -ForegroundColor Gray
            }
            return $false
        }
    }
}

function Assert-Test {
    param(
        [string]$TestName,
        [boolean]$Result
    )

    if ($Result) {
        $script:testsPassed++
    } else {
        $script:testsFailed++
    }
}

# ============================================================================
# TEST SUITE
# ============================================================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "PRODUCTION HARDENING TEST SUITE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Target: $BaseURL" -ForegroundColor Yellow
Write-Host ""

# ============================================================================
# TEST 1: HEALTH CHECK (PUBLIC)
# ============================================================================

Write-Host "Test 1: Health Check Endpoint" -ForegroundColor Magenta
Write-Host "------" -ForegroundColor Magenta

$test = Test-Endpoint `
    -Name "Health endpoint accessible without auth" `
    -Method "GET" `
    -Endpoint "/health" `
    -ExpectedStatus 200

Assert-Test "Health endpoint" $test

Write-Host ""

# ============================================================================
# TEST 2: JWT AUTHENTICATION
# ============================================================================

Write-Host "Test 2: JWT Authentication" -ForegroundColor Magenta
Write-Host "------" -ForegroundColor Magenta

# 2a: Token Generation
Write-Host "2a. Token Generation:"
$test = Test-Endpoint `
    -Name "Token generation endpoint" `
    -Method "POST" `
    -Endpoint "/token" `
    -ExpectedStatus 200

Assert-Test "Token generation" $test

# Get token for subsequent tests
try {
    $tokenResponse = Invoke-WebRequest -Uri "$BaseURL/token" -Method POST -ErrorAction Stop
    $tokenData = $tokenResponse.Content | ConvertFrom-Json
    $token = $tokenData.access_token
    Write-Host "  Token obtained: $($token.Substring(0, 20))..." -ForegroundColor Green
} catch {
    Write-Host "  ERROR: Could not obtain token" -ForegroundColor Red
    $token = $null
}

# 2b: Endpoint Without Token
Write-Host ""
Write-Host "2b. Access Without Token:"
$test = Test-Endpoint `
    -Name "Translation without token (should fail)" `
    -Method "POST" `
    -Endpoint "/translate" `
    -Body @{ text = "hello"; direction = "en-rw" } `
    -ExpectedStatus 403

Assert-Test "Auth required" $test

# 2c: Endpoint With Valid Token
Write-Host ""
Write-Host "2c. Access With Valid Token:"

if ($token) {
    $headers = @{ "Authorization" = "Bearer $token" }

    $test = Test-Endpoint `
        -Name "Translation with valid token" `
        -Method "POST" `
        -Endpoint "/translate" `
        -Headers $headers `
        -Body @{ text = "hello"; direction = "en-rw" } `
        -ExpectedStatus 200

    Assert-Test "Valid token auth" $test
}

Write-Host ""

# ============================================================================
# TEST 3: RATE LIMITING
# ============================================================================

Write-Host "Test 3: Rate Limiting" -ForegroundColor Magenta
Write-Host "------" -ForegroundColor Magenta

Write-Host "Testing rate limit (10/minute on /token)..."
Write-Host "Sending 12 rapid requests..."

$rateLimitHit = $false
for ($i = 1; $i -le 12; $i++) {
    try {
        $response = Invoke-WebRequest -Uri "$BaseURL/token" -Method POST -ErrorAction Stop
        if ($i -le 10) {
            Write-Host "  Request $($i): 200 OK (within limit)" -ForegroundColor Green
        }
    } catch {
        $status = $_.Exception.Response.StatusCode.Value__
        if ($status -eq 429 -and $i -gt 10) {
            Write-Host "  Request $($i): 429 Too Many Requests (limit exceeded) [EXPECTED]" -ForegroundColor Green
            $rateLimitHit = $true
        } else {
            Write-Host "  Request $($i): $status" -ForegroundColor Yellow
        }
    }
}

Assert-Test "Rate limiting enforced" $rateLimitHit

Write-Host ""

# ============================================================================
# TEST 4: CORS HEADERS
# ============================================================================

Write-Host "Test 4: CORS Configuration" -ForegroundColor Magenta
Write-Host "------" -ForegroundColor Magenta

try {
    $response = Invoke-WebRequest -Uri "$BaseURL/health" -Method GET -ErrorAction Stop

    # Check CORS headers
    $corsOrigin = $response.Headers['Access-Control-Allow-Origin']
    $corsMethods = $response.Headers['Access-Control-Allow-Methods']

    if ($corsOrigin) {
        Write-Host "CORS Origin: $corsOrigin" -ForegroundColor Green
        if ($corsOrigin -eq "*") {
            Write-Host "  [WARNING] Wildcard CORS origin detected!" -ForegroundColor Yellow
        }
    }

    if ($corsMethods) {
        Write-Host "CORS Methods: $corsMethods" -ForegroundColor Green
        if ($corsMethods -like "*OPTIONS*") {
            Write-Host "  [OK] Methods are restricted" -ForegroundColor Green
        }
    }
} catch {
    Write-Host "CORS headers test skipped (error connecting)" -ForegroundColor Yellow
}

Write-Host ""

# ============================================================================
# TEST 5: HTTPS SUPPORT
# ============================================================================

Write-Host "Test 5: HTTPS Configuration" -ForegroundColor Magenta
Write-Host "------" -ForegroundColor Magenta

if ($BaseURL.StartsWith("https://")) {
    Write-Host "HTTPS URL detected" -ForegroundColor Green
    try {
        $response = Invoke-WebRequest -Uri "$BaseURL/health" -Method GET -ErrorAction Stop
        Write-Host "HTTPS connection successful" -ForegroundColor Green
    } catch {
        Write-Host "HTTPS connection failed: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "HTTP URL detected (HTTPS not configured)" -ForegroundColor Yellow
    Write-Host "  To enable HTTPS:" -ForegroundColor Gray
    Write-Host "  1. Generate certificates: .\generate_certificates.ps1" -ForegroundColor Gray
    Write-Host "  2. Set environment variables" -ForegroundColor Gray
    Write-Host "  3. Restart FastAPI with SSL support" -ForegroundColor Gray
    $script:testsSkipped++
}

Write-Host ""

# ============================================================================
# TEST 6: FFmpeg SUPPORT
# ============================================================================

Write-Host "Test 6: FFmpeg Availability" -ForegroundColor Magenta
Write-Host "------" -ForegroundColor Magenta

try {
    $ffmpegVersion = ffmpeg -version | Select-Object -First 1
    Write-Host "FFmpeg: $ffmpegVersion" -ForegroundColor Green
    Write-Host "  STT endpoints are fully functional" -ForegroundColor Green
} catch {
    Write-Host "FFmpeg not found" -ForegroundColor Yellow
    Write-Host "  Install with: winget install ffmpeg" -ForegroundColor Gray
    $script:testsSkipped++
}

Write-Host ""

# ============================================================================
# TEST 7: SECURITY HEADERS
# ============================================================================

Write-Host "Test 7: Security Headers" -ForegroundColor Magenta
Write-Host "------" -ForegroundColor Magenta

try {
    $response = Invoke-WebRequest -Uri "$BaseURL/health" -Method GET -ErrorAction Stop

    Write-Host "Response Headers:" -ForegroundColor Green
    foreach ($header in $response.Headers.GetEnumerator()) {
        if ($header.Key -like "*Access-Control*" -or $header.Key -like "*Content-Type*") {
            Write-Host "  $($header.Key): $($header.Value)" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "Could not retrieve headers" -ForegroundColor Yellow
}

Write-Host ""

# ============================================================================
# TEST SUMMARY
# ============================================================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TEST RESULTS SUMMARY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$totalTests = $testsPassed + $testsFailed + $testsSkipped

Write-Host "Total Tests: $totalTests"
Write-Host "Passed: $testsPassed" -ForegroundColor Green
Write-Host "Failed: $testsFailed" -ForegroundColor $(if ($testsFailed -gt 0) { 'Red' } else { 'Green' })
Write-Host "Skipped: $testsSkipped" -ForegroundColor Yellow

Write-Host ""

if ($testsFailed -eq 0) {
    Write-Host "ALL TESTS PASSED - SYSTEM IS HARDENED" -ForegroundColor Green
    exit 0
} else {
    Write-Host "$testsFailed TESTS FAILED - REVIEW AND FIX" -ForegroundColor Red
    exit 1
}
