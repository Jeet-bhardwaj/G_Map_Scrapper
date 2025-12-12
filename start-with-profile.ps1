# Close Brave and start the scraper with your logged-in profile
Write-Host "🔄 Closing all Brave processes..." -ForegroundColor Yellow
Get-Process brave -ErrorAction SilentlyContinue | Stop-Process -Force

Write-Host "🔄 Closing any running Node/scraper processes..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

Write-Host "⏳ Waiting 2 seconds for processes to fully close..." -ForegroundColor Yellow
Start-Sleep -Seconds 2

Write-Host "✅ Starting scraper with your Brave profile..." -ForegroundColor Green
npm run dev
