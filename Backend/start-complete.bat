@echo off
setlocal enabledelayedexpansion
echo ========================================
echo   AgriSmart Backend - Complete Startup
echo ========================================
echo.

REM Get local IP
echo [1/5] Detecting network IP...
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address" ^| findstr "192.168"') do (
    set "IP=%%a"
    set "IP=!IP:~1!"
    echo     WiFi IP: !IP!
)
echo.

REM Check Python environment
echo [2/5] Checking Python environment...
if exist "venv\Scripts\activate.bat" (
    echo     Activating virtual environment...
    call venv\Scripts\activate.bat
) else (
    echo     Using system Python
)
echo.

REM Run database migration
echo [3/5] Running database migration...
python migrate_db.py
if errorlevel 1 (
    echo     ❌ Migration failed!
    pause
    exit /b 1
)
echo.

REM Check dependencies
echo [4/5] Checking dependencies...
python -c "import flask" 2>nul
if errorlevel 1 (
    echo     Installing dependencies...
    pip install -r requirements.txt
) else (
    echo     Dependencies OK!
)
echo.

REM Start server
echo [5/5] Starting backend server...
echo.
echo ========================================
echo   Backend accessible at:
echo   - http://localhost:5000
echo   - http://!IP!:5000 (for mobile)
echo.
echo   Update frontend IP in:
echo   project/utils/env.ts (line 14)
echo   Set BACKEND_NETWORK_IP = '!IP!'
echo ========================================
echo.
echo Press Ctrl+C to stop the server
echo.

python app.py

pause

