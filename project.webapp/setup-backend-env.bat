@echo off
echo ========================================
echo Backend Environment Setup
echo ========================================
echo.

:: Check if .env file exists
if exist ".env" (
    echo .env file already exists.
    set /p choice="Do you want to overwrite it? (y/n): "
    if /i "%choice%" neq "y" (
        echo Setup cancelled.
        pause
        exit /b 0
    )
)

echo.
echo Choose your database setup:
echo 1. PostgreSQL (requires PostgreSQL installed)
echo 2. SQLite (local file-based, no installation required)
echo.
set /p db_choice="Enter your choice (1 or 2): "

if "%db_choice%"=="1" (
    echo.
    echo Setting up PostgreSQL configuration...
    echo.
    set /p db_password="Enter PostgreSQL password (default: password): "
    if "%db_password%"=="" set db_password=password
    
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
    echo # PostgreSQL Database Configuration >> .env
    echo DB_USER=postgres >> .env
    echo DB_HOST=localhost >> .env
    echo DB_NAME=kabini_ai >> .env
    echo DB_PASSWORD=%db_password% >> .env
    echo DB_PORT=5432 >> .env
    echo DB_SSL=false >> .env
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
    
    echo PostgreSQL configuration created!
    echo.
    echo IMPORTANT: Make sure PostgreSQL is running and the database 'kabini_ai' exists.
    echo You can create it with: createdb kabini_ai
    echo.
    
) else if "%db_choice%"=="2" (
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
    
    echo SQLite configuration created!
    echo.
    echo Creating data directory...
    if not exist "data" mkdir data
    echo Data directory created!
    echo.
    
) else (
    echo Invalid choice. Please run the script again.
    pause
    exit /b 1
)

echo.
echo ========================================
echo Environment setup completed!
echo ========================================
echo.
echo Your .env file has been created with the following configuration:
echo.
if "%db_choice%"=="1" (
    echo Database: PostgreSQL
    echo Host: localhost
    echo Database: kabini_ai
    echo User: postgres
    echo Port: 5432
) else (
    echo Database: SQLite (file-based)
    echo Data files: ./data/users.json, ./data/sessions.json
)
echo.
echo Authentication: Local (enabled)
echo JWT Secret: Configured
echo Server Port: 5000
echo.
echo Next steps:
echo 1. Configure your API keys in the .env file
echo 2. Start the backend server
echo.
pause
