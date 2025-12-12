# Close Chrome and start the scraper with your logged-in profile
Write-Host "🔄 Closing all Chrome processes..." -ForegroundColor Yellow
Get-Process chrome -ErrorAction SilentlyContinue | Stop-Process -Force

Write-Host "🔄 Closing any running Node/scraper processes..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

Write-Host "⏳ Waiting 2 seconds for processes to fully close..." -ForegroundColor Yellow
Start-Sleep -Seconds 2

Write-Host "✅ Starting scraper with your Chrome profile..." -ForegroundColor Green
npm run dev
