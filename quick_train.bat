@echo off
REM Quick training script for production speech model
echo.
echo ========================================
echo  PRODUCTION SPEECH MODEL TRAINING
echo ========================================
echo.
echo Training model with real Kinyarwanda dictionary...
echo This will take about 1-2 minutes...
echo.

python train_production_model.py

echo.
echo ========================================
if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✓ TRAINING COMPLETE!
    echo.
    echo Your model is ready. Start the server with:
    echo   npm start
    echo.
    echo Then go to http://localhost:3001 and try the voice search!
    echo.
) else (
    echo ✗ Training failed. Check the errors above.
)
echo ========================================
echo.
pause
