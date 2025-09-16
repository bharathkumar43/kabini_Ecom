Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Kabini.ai Authentication Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "This script will help you set up authentication for your Kabini.ai application." -ForegroundColor Yellow
Write-Host ""

Write-Host "1. Frontend Environment Setup" -ForegroundColor Green
Write-Host "-----------------------------" -ForegroundColor Green
Write-Host "Copy env.local to .env in the root directory:" -ForegroundColor White

try {
    Copy-Item "env.local" ".env" -Force
    Write-Host "✅ Frontend environment file created successfully" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to create frontend environment file: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "2. Backend Environment Setup" -ForegroundColor Green
Write-Host "----------------------------" -ForegroundColor Green
Write-Host "Copy backend/env.local to backend/.env:" -ForegroundColor White

try {
    Copy-Item "backend\env.local" "backend\.env" -Force
    Write-Host "✅ Backend environment file created successfully" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to create backend environment file: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "3. Next Steps" -ForegroundColor Green
Write-Host "-------------" -ForegroundColor Green
Write-Host ""
Write-Host "Please edit the .env files and configure the following:" -ForegroundColor Yellow
Write-Host ""
Write-Host "Frontend (.env):" -ForegroundColor Cyan
Write-Host "- VITE_REACT_APP_GOOGLE_CLIENT_ID: Your Google OAuth client ID" -ForegroundColor White
Write-Host "- VITE_REACT_APP_AZURE_CLIENT_ID: Your Azure AD client ID" -ForegroundColor White
Write-Host "- VITE_REACT_APP_AZURE_TENANT_ID: Your Azure AD tenant ID" -ForegroundColor White
Write-Host ""
Write-Host "Backend (backend/.env):" -ForegroundColor Cyan
Write-Host "- GOOGLE_CLIENT_ID: Your Google OAuth client ID" -ForegroundColor White
Write-Host "- GOOGLE_CLIENT_SECRET: Your Google OAuth client secret" -ForegroundColor White
Write-Host "- AZURE_CLIENT_ID: Your Azure AD client ID" -ForegroundColor White
Write-Host "- AZURE_TENANT_ID: Your Azure AD tenant ID" -ForegroundColor White
Write-Host "- AZURE_CLIENT_SECRET: Your Azure AD client secret" -ForegroundColor White
Write-Host "- JWT_SECRET: A secure random string for JWT signing" -ForegroundColor White
Write-Host ""
Write-Host "4. Database Setup" -ForegroundColor Green
Write-Host "-----------------" -ForegroundColor Green
Write-Host "Make sure PostgreSQL is running and the database 'kabini_ai' exists." -ForegroundColor White
Write-Host "Run: backend\setup-postgresql.ps1" -ForegroundColor White
Write-Host ""
Write-Host "5. Start the Application" -ForegroundColor Green
Write-Host "------------------------" -ForegroundColor Green
Write-Host "Frontend: npm run dev" -ForegroundColor White
Write-Host "Backend: cd backend && npm start" -ForegroundColor White
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan

Read-Host "Press Enter to continue"
