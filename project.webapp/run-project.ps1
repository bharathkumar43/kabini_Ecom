# PowerShell script to install packages and run both frontend and backend
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Starting Kabini Project Setup and Run" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
Write-Host "Checking Node.js installation..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Node.js is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Check if npm is installed
Write-Host "Checking npm installation..." -ForegroundColor Yellow
try {
    $npmVersion = npm --version
    Write-Host "npm version: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: npm is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install npm or check your Node.js installation" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""

# Get the script directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Install frontend dependencies
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Installing Frontend Dependencies..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Set-Location $scriptDir
if (Test-Path "node_modules") {
    Write-Host "Frontend node_modules already exists, skipping installation..." -ForegroundColor Yellow
} else {
    Write-Host "Installing frontend packages..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to install frontend dependencies" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
}
Write-Host "Frontend dependencies installed successfully!" -ForegroundColor Green
Write-Host ""

# Install backend dependencies
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Installing Backend Dependencies..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Set-Location "$scriptDir\backend"
if (Test-Path "node_modules") {
    Write-Host "Backend node_modules already exists, skipping installation..." -ForegroundColor Yellow
} else {
    Write-Host "Installing backend packages..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to install backend dependencies" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
}
Write-Host "Backend dependencies installed successfully!" -ForegroundColor Green
Write-Host ""

# Setup backend environment
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Setting Up Backend Environment..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Set-Location "$scriptDir\backend"

# Check if .env exists
if (-not (Test-Path ".env")) {
    Write-Host "No .env file found. Setting up environment..." -ForegroundColor Yellow
    
    # Create .env with SQLite configuration (easier to set up)
    Write-Host "Creating .env file with SQLite configuration..." -ForegroundColor Yellow
    
    @"
# Server Configuration
PORT=5000
NODE_ENV=development

# Authentication Configuration
AUTH_TYPE=local
ENABLE_LOCAL_AUTH=true

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-12345
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production-12345
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# SQLite Database Configuration
DB_PATH=./data/users.json
SESSIONS_PATH=./data/sessions.json

# Email Configuration (optional)
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
SMTP_FROM=

# Azure AD Configuration (if using Azure auth)
AZURE_CLIENT_ID=
AZURE_TENANT_ID=
AZURE_CLIENT_SECRET=

# Google OAuth Configuration
GOOGLE_CLIENT_ID=

# LLM Configuration
GEMINI_API_KEY=your_gemini_api_key_here
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
PERPLEXITY_API_KEY=
SERPER_API_KEY=
"@ | Out-File -FilePath ".env" -Encoding UTF8
    
    # Create data directory
    if (-not (Test-Path "data")) {
        New-Item -ItemType Directory -Path "data" | Out-Null
        Write-Host "Created data directory" -ForegroundColor Green
    }
    
    Write-Host "Backend environment configured with SQLite!" -ForegroundColor Green
    Write-Host "Note: You can configure API keys in the .env file later" -ForegroundColor Yellow
} else {
    Write-Host ".env file already exists, skipping environment setup..." -ForegroundColor Yellow
}

Write-Host ""

# Check for environment files in frontend
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Checking Frontend Environment..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Set-Location $scriptDir
if (-not (Test-Path ".env")) {
    if (Test-Path "env.example") {
        Write-Host "Copying env.example to .env..." -ForegroundColor Yellow
        Copy-Item "env.example" ".env"
        Write-Host "Please configure your .env file with your settings" -ForegroundColor Yellow
    } else {
        Write-Host "WARNING: No .env file found and no env.example available" -ForegroundColor Yellow
        Write-Host "You may need to create a .env file manually" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Starting Both Frontend and Backend..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Frontend will run on: http://localhost:5173" -ForegroundColor Green
Write-Host "Backend will run on: http://localhost:5000" -ForegroundColor Green
Write-Host ""
Write-Host "Press Ctrl+C to stop both servers" -ForegroundColor Yellow
Write-Host ""

# Start backend in a new PowerShell window
Write-Host "Starting Backend Server..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$scriptDir\backend'; npm run dev" -WindowStyle Normal

# Wait a moment for backend to start
Write-Host "Waiting for backend to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Start frontend in current window
Write-Host "Starting Frontend Server..." -ForegroundColor Yellow
Set-Location $scriptDir
npm run dev

Write-Host ""
Write-Host "Both servers have been stopped." -ForegroundColor Cyan
Read-Host "Press Enter to exit"
