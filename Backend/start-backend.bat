@echo off
REM AgriSmart Backend Startup Script
echo.
echo ========================================
echo   AgriSmart Backend Server Startup
echo ========================================
echo.

REM Get local IP
echo [1/4] Detecting network IP...
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address"') do (
    set "IP=%%a"
    set "IP=!IP:~1!"
    echo     Found: !IP!
)

REM Check if virtual environment exists
echo.
echo [2/4] Checking Python environment...
if exist "venv\Scripts\activate.bat" (
    echo     Virtual environment found!
    call venv\Scripts\activate.bat
) else (
    echo     No virtual environment found. Using system Python.
)

REM Check dependencies
echo.
echo [3/4] Checking dependencies...
python -c "import flask" 2>nul
if errorlevel 1 (
    echo     [WARNING] Flask not found. Installing dependencies...
    pip install -r requirements.txt
) else (
    echo     Dependencies OK!
)

REM Start server
echo.
echo [4/4] Starting backend server...
echo.
echo ========================================
echo   Backend will be accessible at:
echo   - http://localhost:5000
echo   - http://127.0.0.1:5000
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address" ^| findstr "192.168"') do (
    set "WIFI_IP=%%a"
    set "WIFI_IP=!WIFI_IP:~1!"
    echo   - http://!WIFI_IP!:5000 ^(WiFi - Use this for mobile!^)
)
echo ========================================
echo.
echo Press Ctrl+C to stop the server
echo.

python app.py

pause

