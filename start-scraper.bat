@echo off
echo.
echo ========================================
echo   KTYM Lead Scraper - Brave Browser
echo ========================================
echo.
echo [1/3] Closing Brave...
taskkill /F /IM brave.exe >nul 2>&1
if %errorlevel% equ 0 (
    echo       Brave closed successfully
) else (
    echo       No Brave processes found
)
echo.
echo [2/3] Closing Node processes...
taskkill /F /IM node.exe >nul 2>&1
echo.
echo [3/3] Starting scraper with your Brave profile...
timeout /t 2 /nobreak >nul
echo.
echo ========================================
echo   Server starting at http://localhost:3001
echo ========================================
echo.
npm run dev
