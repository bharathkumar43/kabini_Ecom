@echo off
echo ========================================
echo Kabini.ai Authentication Setup
echo ========================================
echo.

echo This script will help you set up authentication for your Kabini.ai application.
echo.

echo 1. Frontend Environment Setup
echo -----------------------------
echo Copy env.local to .env in the root directory:
copy env.local .env
if %errorlevel% equ 0 (
    echo ✅ Frontend environment file created successfully
) else (
    echo ❌ Failed to create frontend environment file
)

echo.
echo 2. Backend Environment Setup
echo ----------------------------
echo Copy backend/env.local to backend/.env:
copy backend\env.local backend\.env
if %errorlevel% equ 0 (
    echo ✅ Backend environment file created successfully
) else (
    echo ❌ Failed to create backend environment file
)

echo.
echo 3. Next Steps
echo -------------
echo.
echo Please edit the .env files and configure the following:
echo.
echo Frontend (.env):
echo - VITE_REACT_APP_GOOGLE_CLIENT_ID: Your Google OAuth client ID
echo - VITE_REACT_APP_AZURE_CLIENT_ID: Your Azure AD client ID
echo - VITE_REACT_APP_AZURE_TENANT_ID: Your Azure AD tenant ID
echo.
echo Backend (backend/.env):
echo - GOOGLE_CLIENT_ID: Your Google OAuth client ID
echo - GOOGLE_CLIENT_SECRET: Your Google OAuth client secret
echo - AZURE_CLIENT_ID: Your Azure AD client ID
echo - AZURE_TENANT_ID: Your Azure AD tenant ID
echo - AZURE_CLIENT_SECRET: Your Azure AD client secret
echo - JWT_SECRET: A secure random string for JWT signing
echo.
echo 4. Database Setup
echo -----------------
echo Make sure PostgreSQL is running and the database 'kabini_ai' exists.
echo Run: backend\setup-postgresql.bat
echo.
echo 5. Start the Application
echo ------------------------
echo Frontend: npm run dev
echo Backend: cd backend && npm start
echo.
echo ========================================
pause
