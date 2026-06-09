param(
    [string]$Database = 'ines_intelligent_library',
    [string]$OutputDirectory = (Join-Path $PSScriptRoot '..\backups')
)

$ErrorActionPreference = 'Stop'
$dump = 'C:\xampp\mysql\bin\mysqldump.exe'
if (-not (Test-Path -LiteralPath $dump)) {
    throw "mysqldump was not found at $dump"
}

$resolvedOutput = [System.IO.Path]::GetFullPath($OutputDirectory)
New-Item -ItemType Directory -Path $resolvedOutput -Force | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$target = Join-Path $resolvedOutput "$Database-$stamp.sql"

& $dump --user=root --host=127.0.0.1 --port=3306 --single-transaction --routines --triggers --events --databases $Database |
    Set-Content -LiteralPath $target -Encoding utf8

if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $target) -or (Get-Item -LiteralPath $target).Length -eq 0) {
    throw 'Database backup failed.'
}

Write-Output $target
