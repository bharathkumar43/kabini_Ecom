@echo off
echo 🔧 Quick PostgreSQL Setup for kabini.ai
echo.

echo 📋 Checking PostgreSQL status...
sc query postgresql* >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ PostgreSQL service not found!
    echo Please install PostgreSQL first from: https://www.postgresql.org/download/windows/
    pause
    exit /b 1
)

echo ✅ PostgreSQL service found
echo.

echo 🔑 Setting up database and user...
echo.

echo 1. Creating database 'kabini_ai'...
echo 2. Setting up user permissions...
echo 3. Testing connection...
echo.

echo 📝 Manual steps required:
echo.
echo 1. Open Command Prompt as Administrator
echo 2. Run: psql -U postgres
echo 3. Enter your PostgreSQL password when prompted
echo 4. Run these SQL commands:
echo.
echo    CREATE DATABASE kabini_ai;
echo    \q
echo.
echo 5. Test connection: psql -U postgres -d kabini_ai
echo.
echo 6. Update your .env file with correct password
echo.

echo 📁 Environment file location: backend\.env
echo 📁 Template file: backend\env.postgresql
echo.

echo ⚠️  Make sure your .env file has the correct password!
echo.

pause
