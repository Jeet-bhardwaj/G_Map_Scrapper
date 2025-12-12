@echo off
echo.
echo ========================================
echo   KTYM Lead Scraper - Chrome Profile
echo ========================================
echo.
echo [1/3] Closing Chrome...
taskkill /F /IM chrome.exe >nul 2>&1
if %errorlevel% equ 0 (
    echo       Chrome closed successfully
) else (
    echo       No Chrome processes found
)
echo.
echo [2/3] Closing Node processes...
taskkill /F /IM node.exe >nul 2>&1
echo.
echo [3/3] Starting scraper with your profile...
timeout /t 2 /nobreak >nul
echo.
echo ========================================
echo   Server starting at http://localhost:3001
echo ========================================
echo.
npm run dev
