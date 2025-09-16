@echo off
echo ========================================
echo    Updating Production Environment
echo ========================================
echo.

echo Updating .env file with production configuration...

REM Create a temporary file with the updated content
(
echo # API Configuration
echo VITE_REACT_APP_API_URL=https://app.kabini.ai/api
echo.
echo # Authentication Configuration
echo VITE_REACT_APP_AZURE_CLIENT_ID=your-azure-client-id-here
echo VITE_REACT_APP_AZURE_TENANT_ID=your-azure-tenant-id-here
echo VITE_REACT_APP_REDIRECT_URI=https://app.kabini.ai/auth/callback
echo.
echo # Google OAuth Configuration
echo VITE_REACT_APP_GOOGLE_CLIENT_ID=your-google-client-id-here
echo.
echo # App Configuration
echo VITE_APP_NAME=kabini.ai
echo VITE_APP_VERSION=1.0.0
) > .env

echo ✅ Production .env file updated successfully!
echo.
echo 📋 Updated configuration:
echo API URL: https://app.kabini.ai/api
echo Azure Client ID: your-azure-client-id-here
echo Azure Tenant ID: your-azure-tenant-id-here
echo Google Client ID: your-google-client-id-here
echo.
echo 🔄 Please rebuild and redeploy your application:
echo 1. Run: npm run build
echo 2. Restart your backend server
echo.
echo Then try Google login again!
echo.
pause 