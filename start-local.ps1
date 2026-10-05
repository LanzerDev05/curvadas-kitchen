# ==============================================================================
# Curvada's Kitchen - Localhost BE & FE Startup Script
# ==============================================================================
# Starts Standalone Backend (Port 5000) & Vite Frontend Web App (Port 3000)
# ==============================================================================

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   Curvada's Kitchen - Launching Local Development" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   Backend API & WS: http://localhost:5000" -ForegroundColor Yellow
Write-Host "   Frontend Web App: http://localhost:3000" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

$rootPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $rootPath

# Check if node_modules exist
if (-not (Test-Path "$rootPath\node_modules")) {
    Write-Host "📦 Installing Frontend dependencies..." -ForegroundColor Cyan
    npm install
}

if (-not (Test-Path "$rootPath\backend\node_modules")) {
    Write-Host "📦 Installing Backend dependencies..." -ForegroundColor Cyan
    npm --prefix backend install
}

# Run both Backend and Frontend concurrently
Write-Host "🚀 Starting Backend and Frontend concurrently..." -ForegroundColor Green
npm run dev:all
