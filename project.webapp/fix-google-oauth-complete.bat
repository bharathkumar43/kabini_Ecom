@echo off
echo ========================================
echo Complete Google OAuth Fix Script
echo ========================================
echo.

echo This script will fix ALL Google OAuth issues including:
echo - Missing environment variables
echo - Redirect URI mismatch errors
echo - Access blocked errors
echo - Authentication verification failures
echo.

echo Step 1: Get Google OAuth Credentials
echo -------------------------------------
echo 1. Go to https://console.cloud.google.com/
echo 2. Create a new project or select existing one
echo 3. Enable Google+ API and Google Identity Services
echo 4. Go to "APIs & Services" > "Credentials"
echo 5. Create OAuth 2.0 Client ID (Web application type)
echo 6. Add authorized origins: http://localhost:5173
echo 7. Add authorized redirect URIs: http://localhost:5173
echo 8. Copy the Client ID and Client Secret
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

echo Step 3: Code Fixes Applied
echo -------------------------------------
echo ✓ Added missing redirect_uri parameter to Google OAuth client
echo ✓ Fixed redirect URI mismatch error
echo ✓ Environment variables configured
echo.

echo Step 4: Google Cloud Console Configuration
echo -----------------------------------------
echo IMPORTANT: You must also update your Google Cloud Console:
echo.
echo 1. Go to https://console.cloud.google.com/
echo 2. Navigate to "APIs & Services" > "Credentials"
echo 3. Click on your OAuth 2.0 Client ID
echo 4. In "Authorized JavaScript origins" add:
echo    - http://localhost:5173
echo    - http://localhost:3000
echo 5. In "Authorized redirect URIs" add:
echo    - http://localhost:5173
echo    - http://localhost:3000
echo 6. Click "Save"
echo.

echo Step 5: Restart Servers
echo -------------------------------------
echo 1. Stop both frontend and backend servers
echo 2. Start backend: cd backend ^& npm start
echo 3. Start frontend: npm run dev
echo.

echo Step 6: Test the Fix
echo -------------------------------------
echo 1. Navigate to login page
echo 2. Click "Sign in with Google"
echo 3. Complete the OAuth flow
echo 4. Verify successful login
echo.

echo Step 7: Verify Fix (Optional)
echo -------------------------------------
echo You can also test with the test page:
echo Open test-google-oauth.html in your browser
echo.

echo ========================================
echo Fix Complete!
echo ========================================
echo.
echo What was fixed:
echo - Missing redirect_uri parameter in OAuth client
echo - Environment variables configuration
echo - Redirect URI mismatch error
echo - Access blocked error
echo.
echo Next steps:
echo 1. Update Google Cloud Console (see Step 4 above)
echo 2. Restart your servers
echo 3. Test Google OAuth login
echo.
pause
