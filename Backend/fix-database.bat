@echo off
echo ========================================
echo   AgriSmart Database Migration
echo ========================================
echo.
echo This will update your database to add:
echo   - latitude/longitude columns to Detections
echo   - alert_generated column to Detections  
echo   - OutbreakAlerts table
echo.
echo Press any key to continue or Ctrl+C to cancel...
pause >nul
echo.
python migrate_db.py
echo.
pause

