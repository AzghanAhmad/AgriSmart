@echo off
echo Restarting AgriSmart Backend...
echo.

REM Kill any running Python processes for AgriSmart
taskkill /F /FI "WINDOWTITLE eq AgriSmart Backend*" 2>nul

REM Wait a moment
timeout /t 2 /nobreak >nul

REM Delete old database to start fresh
if exist agrismart.db del /F agrismart.db
if exist agrismart_test.db del /F agrismart_test.db

echo Starting backend...
python app.py

pause

