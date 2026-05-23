# Generate Self-Signed SSL Certificates for FastAPI HTTPS
# Usage: .\generate_certificates.ps1 -Days 365 -Force

param(
    [int]$Days = 365,
    [switch]$Force = $false
)

Write-Host "===========================================" -ForegroundColor Green
Write-Host "SSL Certificate Generation Script" -ForegroundColor Green
Write-Host "===========================================" -ForegroundColor Green

# Check if files already exist
if ((Test-Path "cert.pem") -or (Test-Path "key.pem")) {
    if (-not $Force) {
        Write-Host "Certificate files already exist. Use -Force to overwrite." -ForegroundColor Yellow
        exit 0
    }
    Write-Host "Removing existing certificate files..." -ForegroundColor Yellow
    Remove-Item -Path "cert.pem", "key.pem" -ErrorAction SilentlyContinue
}

# Verify OpenSSL is installed
try {
    $opensslVersion = openssl version
    Write-Host "OpenSSL found: $opensslVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: OpenSSL not found. Please install OpenSSL or use Git Bash." -ForegroundColor Red
    Write-Host "Download from: https://slproweb.com/products/Win32OpenSSL.html" -ForegroundColor Yellow
    exit 1
}

# Generate self-signed certificate
Write-Host ""
Write-Host "Generating self-signed certificate (valid for $Days days)..." -ForegroundColor Cyan

$cmd = @"
openssl req -x509 `
    -newkey rsa:4096 `
    -keyout key.pem `
    -out cert.pem `
    -days $Days `
    -nodes `
    -subj "/C=RW/ST=Kigali/L=Kigali/O=Digital Library/CN=localhost"
"@

Invoke-Expression $cmd

# Check if generation was successful
if ((Test-Path "cert.pem") -and (Test-Path "key.pem")) {
    Write-Host ""
    Write-Host "SUCCESS: Certificates generated successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Generated files:" -ForegroundColor Cyan
    Write-Host "  - cert.pem  (Public certificate)" -ForegroundColor Gray
    Write-Host "  - key.pem   (Private key)" -ForegroundColor Gray
    Write-Host ""

    # Display certificate info
    Write-Host "Certificate Details:" -ForegroundColor Cyan
    openssl x509 -in cert.pem -text -noout | Select-String "Subject:|Issuer:|Not Before|Not After|Public Key"

    Write-Host ""
    Write-Host "Configuration:" -ForegroundColor Cyan
    Write-Host "  Set environment variables:" -ForegroundColor Gray
    Write-Host "    SSL_CERT_FILE=cert.pem" -ForegroundColor Yellow
    Write-Host "    SSL_KEY_FILE=key.pem" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  Or start FastAPI with:" -ForegroundColor Gray
    Write-Host "    .\venv\Scripts\python -m uvicorn app:app --ssl-certfile cert.pem --ssl-keyfile key.pem" -ForegroundColor Yellow

} else {
    Write-Host "ERROR: Certificate generation failed!" -ForegroundColor Red
    exit 1
}
