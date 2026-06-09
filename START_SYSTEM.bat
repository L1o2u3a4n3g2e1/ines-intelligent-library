@echo off
setlocal
cd /d C:\xampp\htdocs\digital-library

echo Starting INES Digital Library...
echo Apache and MySQL must be running in XAMPP.

start "INES Frontend" /min cmd /c "npm run dev"
powershell -ExecutionPolicy Bypass -File scripts\start_ai_services.ps1
timeout /T 5 /nobreak >nul
powershell -ExecutionPolicy Bypass -File scripts\check_system.ps1

echo.
echo Application: http://127.0.0.1:3000
echo PHP API:     http://localhost/digital-library/backend
endlocal
