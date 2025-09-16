@echo off
echo ========================================
echo Backend Connection Fix
echo ========================================
echo.

cd /d "%~dp0backend"

echo Current backend configuration:
echo.

if exist ".env" (
    echo .env file found. Checking configuration...
    echo.
    findstr "DB_" .env
    echo.
    findstr "JWT_SECRET" .env
    echo.
) else (
    echo No .env file found!
)

echo.
echo Choose an option:
echo 1. Use SQLite (recommended - no database setup required)
echo 2. Fix PostgreSQL connection
echo 3. View current .env file
echo.
set /p choice="Enter your choice (1-3): "

if "%choice%"=="1" (
    echo.
    echo Setting up SQLite configuration...
    echo.
    
    echo # Server Configuration > .env
    echo PORT=5000 >> .env
    echo NODE_ENV=development >> .env
    echo. >> .env
    echo # Authentication Configuration >> .env
    echo AUTH_TYPE=local >> .env
    echo ENABLE_LOCAL_AUTH=true >> .env
    echo. >> .env
    echo # JWT Configuration >> .env
    echo JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-12345 >> .env
    echo JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production-12345 >> .env
    echo JWT_EXPIRES_IN=7d >> .env
    echo JWT_REFRESH_EXPIRES_IN=30d >> .env
    echo. >> .env
    echo # SQLite Database Configuration >> .env
    echo DB_PATH=./data/users.json >> .env
    echo SESSIONS_PATH=./data/sessions.json >> .env
    echo. >> .env
    echo # Email Configuration (optional) >> .env
    echo SMTP_HOST= >> .env
    echo SMTP_PORT= >> .env
    echo SMTP_USER= >> .env
    echo SMTP_PASS= >> .env
    echo SMTP_FROM= >> .env
    echo. >> .env
    echo # Azure AD Configuration (if using Azure auth) >> .env
    echo AZURE_CLIENT_ID= >> .env
    echo AZURE_TENANT_ID= >> .env
    echo AZURE_CLIENT_SECRET= >> .env
    echo. >> .env
    echo # Google OAuth Configuration >> .env
    echo GOOGLE_CLIENT_ID= >> .env
    echo. >> .env
    echo # LLM Configuration >> .env
    echo GEMINI_API_KEY=your_gemini_api_key_here >> .env
    echo OPENAI_API_KEY= >> .env
    echo ANTHROPIC_API_KEY= >> .env
    echo PERPLEXITY_API_KEY= >> .env
    echo SERPER_API_KEY= >> .env
    
    if not exist "data" mkdir data
    echo Data directory created!
    echo.
    echo SQLite configuration created successfully!
    echo Backend should now work without database connection issues.
    echo.
    
) else if "%choice%"=="2" (
    echo.
    echo To fix PostgreSQL connection, you need to:
    echo 1. Make sure PostgreSQL is installed and running
    echo 2. Create a database named 'kabini_ai'
    echo 3. Set the correct password in .env file
    echo.
    echo Current PostgreSQL settings in .env:
    findstr "DB_" .env
    echo.
    echo To create the database, run: createdb kabini_ai
    echo To set a new password, edit the .env file and change DB_PASSWORD
    echo.
    
) else if "%choice%"=="3" (
    echo.
    echo Current .env file contents:
    echo ========================================
    type .env
    echo ========================================
    echo.
) else (
    echo Invalid choice.
)

echo.
echo Fix completed! You can now restart the backend server.
pause
