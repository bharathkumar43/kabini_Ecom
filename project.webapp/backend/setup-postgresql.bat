@echo off
echo Setting up PostgreSQL for kabini.ai...
echo.

echo Installing PostgreSQL dependencies...
npm install pg@^8.11.3

echo.
echo PostgreSQL setup completed!
echo.
echo Next steps:
echo 1. Install PostgreSQL on your system if not already installed
echo 2. Create a database named 'kabini_ai'
echo 3. Update the database credentials in env.postgresql
echo 4. Run: npm run init-db
echo.
echo For PostgreSQL installation, visit: https://www.postgresql.org/download/
echo.
pause
