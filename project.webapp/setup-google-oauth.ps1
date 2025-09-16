# Google OAuth Setup Script for PowerShell
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Google OAuth Setup Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "This script will help you set up Google OAuth authentication." -ForegroundColor Yellow
Write-Host ""

Write-Host "Step 1: Get Google OAuth Credentials" -ForegroundColor Green
Write-Host "-------------------------------------" -ForegroundColor Green
Write-Host "1. Go to https://console.cloud.google.com/" -ForegroundColor White
Write-Host "2. Create a new project or select existing one" -ForegroundColor White
Write-Host "3. Enable Google+ API and Google Identity Services" -ForegroundColor White
Write-Host "4. Go to 'APIs & Services' > 'Credentials'" -ForegroundColor White
Write-Host "5. Create OAuth 2.0 Client ID (Web application type)" -ForegroundColor White
Write-Host "6. Add authorized origins: http://localhost:5173" -ForegroundColor White
Write-Host "7. Copy the Client ID and Client Secret" -ForegroundColor White
Write-Host ""

$googleClientId = Read-Host "Enter your Google Client ID"
$googleClientSecret = Read-Host "Enter your Google Client Secret"

Write-Host ""
Write-Host "Step 2: Creating environment files..." -ForegroundColor Green
Write-Host ""

# Create frontend .env file
$frontendEnv = @"
# API Configuration
VITE_REACT_APP_API_URL=http://localhost:5000/api

# Authentication Configuration
VITE_REACT_APP_AZURE_CLIENT_ID=
VITE_REACT_APP_AZURE_TENANT_ID=
VITE_REACT_APP_REDIRECT_URI=http://localhost:5173/auth/callback

# Google OAuth Configuration
VITE_REACT_APP_GOOGLE_CLIENT_ID=$googleClientId

# App Configuration
VITE_APP_NAME=kabini.ai
VITE_APP_VERSION=1.0.0
"@

$frontendEnv | Out-File -FilePath ".env" -Encoding UTF8
Write-Host "✓ Frontend .env file created" -ForegroundColor Green

# Create backend .env file
$backendEnv = @"
# Server Configuration
PORT=5000
NODE_ENV=development

# Authentication Configuration
AUTH_TYPE=local
ENABLE_LOCAL_AUTH=true

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# Database Configuration
DB_PATH=./data/users.json
SESSIONS_PATH=./data/sessions.json

# Google OAuth Configuration
GOOGLE_CLIENT_ID=$googleClientId
GOOGLE_CLIENT_SECRET=$googleClientSecret

# LLM Configuration
GEMINI_API_KEY=your_gemini_api_key_here
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
PERPLEXITY_API_KEY=
"@

$backendEnv | Out-File -FilePath "backend\.env" -Encoding UTF8
Write-Host "✓ Backend .env file created" -ForegroundColor Green

Write-Host ""
Write-Host "Environment files created successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Step 3: Restart your servers" -ForegroundColor Green
Write-Host "-------------------------------------" -ForegroundColor Green
Write-Host "1. Stop both frontend and backend servers" -ForegroundColor White
Write-Host "2. Start backend: cd backend && npm start" -ForegroundColor White
Write-Host "3. Start frontend: npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "Step 4: Test Google OAuth" -ForegroundColor Green
Write-Host "-------------------------------------" -ForegroundColor Green
Write-Host "1. Navigate to login page" -ForegroundColor White
Write-Host "2. Click 'Sign in with Google'" -ForegroundColor White
Write-Host "3. Complete the OAuth flow" -ForegroundColor White
Write-Host "4. Verify successful login" -ForegroundColor White
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Setup Complete!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Read-Host "Press Enter to continue"
