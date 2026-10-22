$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot

$npm = Get-Command npm.cmd -ErrorAction SilentlyContinue
if (-not $npm) {
    $npm = Get-Command npm -ErrorAction SilentlyContinue
}
if (-not $npm) {
    Write-Host 'Node.js and npm are required. Install Node.js LTS, then run this file again.' -ForegroundColor Red
    Read-Host 'Press Enter to close'
    exit 1
}

$tsxCommand = Join-Path $PSScriptRoot 'node_modules\.bin\tsx.cmd'
if (-not (Test-Path -LiteralPath $tsxCommand)) {
    Write-Host 'Installing the application dependencies. This may take a few minutes...'
    & $npm.Source ci
    if ($LASTEXITCODE -ne 0) {
        Write-Host 'Dependency installation failed. Check your internet connection and try again.' -ForegroundColor Red
        Read-Host 'Press Enter to close'
        exit 1
    }
}

$randomBytes = New-Object byte[] 24
[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($randomBytes)
$adminPassword = ([BitConverter]::ToString($randomBytes)).Replace('-', '')

$availablePort = $null
foreach ($candidatePort in 4173..4199) {
    $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Any, $candidatePort)
    try {
        $listener.Start()
        $listener.Stop()
        $availablePort = $candidatePort
        break
    } catch {
        try { $listener.Stop() } catch { }
    }
}

if ($null -eq $availablePort) {
    Write-Host 'No free local preview port was found between 4173 and 4199.' -ForegroundColor Red
    Read-Host 'Press Enter to close'
    exit 1
}

$env:NODE_ENV = 'development'
$env:PORT = [string]$availablePort
$env:DATA_DIR = Join-Path $PSScriptRoot 'local-preview-data'
$env:ADMIN_USERNAME = 'admin'
$env:ADMIN_PASSWORD = $adminPassword
$env:STAFF_ACCOUNTS_JSON = '[]'

Write-Host ''
Write-Host 'Gloryday Pharma — local review copy' -ForegroundColor Cyan
Write-Host "Address: http://127.0.0.1:$availablePort"
Write-Host 'Admin username: admin'
Write-Host "Temporary admin password: $adminPassword" -ForegroundColor Yellow
Write-Host 'Demo catalog and orders are stored in local-preview-data on this computer.'
Write-Host 'This preview does not connect to Supabase. Press Ctrl+C in this window to stop it.'
Write-Host ''

& $npm.Source run dev
if ($LASTEXITCODE -ne 0) {
    Write-Host 'The local preview stopped with an error. Check the message above.' -ForegroundColor Red
    Read-Host 'Press Enter to close'
}
