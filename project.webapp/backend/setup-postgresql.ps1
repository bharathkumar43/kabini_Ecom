Write-Host "Setting up PostgreSQL for kabini.ai..." -ForegroundColor Green
Write-Host ""

Write-Host "Installing PostgreSQL dependencies..." -ForegroundColor Yellow
npm install pg@^8.11.3

Write-Host ""
Write-Host "PostgreSQL setup completed!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Install PostgreSQL on your system if not already installed"
Write-Host "2. Create a database named 'kabini_ai'"
Write-Host "3. Update the database credentials in env.postgresql"
Write-Host "4. Run: npm run init-db"
Write-Host ""
Write-Host "For PostgreSQL installation, visit: https://www.postgresql.org/download/" -ForegroundColor Blue
Write-Host ""
Read-Host "Press Enter to continue"
