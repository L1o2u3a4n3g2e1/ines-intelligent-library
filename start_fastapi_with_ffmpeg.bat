@echo off
REM Start FastAPI with FFmpeg in PATH

setlocal enabledelayedexpansion

REM Set FFmpeg path
set FFMPEG_PATH=C:\Users\Anne Louange\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.1.1-full_build\bin

REM Add to PATH
set PATH=!FFMPEG_PATH!;!PATH!

REM Verify FFmpeg
echo [*] Checking FFmpeg...
ffmpeg -version >nul 2>&1
if errorlevel 1 (
    echo [FAIL] FFmpeg not found
    exit /b 1
) else (
    echo [OK] FFmpeg available
)

REM Start FastAPI
echo [*] Starting FastAPI with FFmpeg support...
cd /d "C:\xampp\htdocs\digital-library\pretrained_ai_models"
python -m uvicorn app:app --host 127.0.0.1 --port 8000

endlocal
