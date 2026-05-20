$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$apiPath = Join-Path $repoRoot 'NexcallApi\Nexcall.Api'
$uiPath = Join-Path $repoRoot 'NexcallUI'

Write-Host 'Starting backend (dotnet watch run --launch-profile https)...'
Start-Process powershell -ArgumentList '-NoExit', '-Command', "Set-Location '$apiPath'; dotnet watch run --launch-profile https"

Write-Host 'Starting frontend (npm start)...'
Start-Process powershell -ArgumentList '-NoExit', '-Command', "Set-Location '$uiPath'; npm start"

Write-Host 'Both processes started in separate terminals.'
Write-Host 'API: https://localhost:7248'
Write-Host 'UI:  http://localhost:4200'
