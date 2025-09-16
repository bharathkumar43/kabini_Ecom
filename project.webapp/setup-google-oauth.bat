@echo off
echo ========================================
echo Google OAuth Setup Script
echo ========================================
echo.

echo This script will help you set up Google OAuth authentication.
echo.

echo Step 1: Get Google OAuth Credentials
echo -------------------------------------
echo 1. Go to https://console.cloud.google.com/
echo 2. Create a new project or select existing one
echo 3. Enable Google+ API and Google Identity Services
echo 4. Go to "APIs & Services" > "Credentials"
echo 5. Create OAuth 2.0 Client ID (Web application type)
echo 6. Add authorized origins: http://localhost:5173
echo 7. Copy the Client ID and Client Secret
echo.

set /p GOOGLE_CLIENT_ID="Enter your Google Client ID: "
set /p GOOGLE_CLIENT_SECRET="Enter your Google Client Secret: "

echo.
echo Step 2: Creating environment files...
echo.

REM Create frontend .env file
echo # API Configuration > .env
echo VITE_REACT_APP_API_URL=http://localhost:5000/api >> .env
echo. >> .env
echo # Authentication Configuration >> .env
echo VITE_REACT_APP_AZURE_CLIENT_ID= >> .env
echo VITE_REACT_APP_AZURE_TENANT_ID= >> .env
echo VITE_REACT_APP_REDIRECT_URI=http://localhost:5173/auth/callback >> .env
echo. >> .env
echo # Google OAuth Configuration >> .env
echo VITE_REACT_APP_GOOGLE_CLIENT_ID=%GOOGLE_CLIENT_ID% >> .env
echo. >> .env
echo # App Configuration >> .env
echo VITE_APP_NAME=kabini.ai >> .env
echo VITE_APP_VERSION=1.0.0 >> .env

REM Create backend .env file
echo # Server Configuration > backend\.env
echo PORT=5000 >> backend\.env
echo NODE_ENV=development >> backend\.env
echo. >> backend\.env
echo # Authentication Configuration >> backend\.env
echo AUTH_TYPE=local >> backend\.env
echo ENABLE_LOCAL_AUTH=true >> backend\.env
echo. >> backend\.env
echo # JWT Configuration >> backend\.env
echo JWT_SECRET=your-super-secret-jwt-key-change-this-in-production >> backend\.env
echo JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production >> backend\.env
echo JWT_EXPIRES_IN=7d >> backend\.env
echo JWT_REFRESH_EXPIRES_IN=30d >> backend\.env
echo. >> backend\.env
echo # Database Configuration >> backend\.env
echo DB_PATH=./data/users.json >> backend\.env
echo SESSIONS_PATH=./data/sessions.json >> backend\.env
echo. >> backend\.env
echo # Google OAuth Configuration >> backend\.env
echo GOOGLE_CLIENT_ID=%GOOGLE_CLIENT_ID% >> backend\.env
echo GOOGLE_CLIENT_SECRET=%GOOGLE_CLIENT_SECRET% >> backend\.env

echo.
echo Environment files created successfully!
echo.
echo Step 3: Restart your servers
echo -------------------------------------
echo 1. Stop both frontend and backend servers
echo 2. Start backend: cd backend ^& npm start
echo 3. Start frontend: npm run dev
echo.
echo Step 4: Test Google OAuth
echo -------------------------------------
echo 1. Navigate to login page
echo 2. Click "Sign in with Google"
echo 3. Complete the OAuth flow
echo 4. Verify successful login
echo.
echo ========================================
echo Setup Complete!
echo ========================================
pause
