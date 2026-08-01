@echo off
title Ninja Hub Desktop - DEBUG TERMINAL LOGS
color 0A
echo =======================================================================
echo          NINJA HUB DESKTOP - DEBUG TERMINAL MODE
echo =======================================================================
echo.
echo Launching Ninja Hub Desktop with live debug logging...
echo.
echo NOTE:
echo   - All console logs, errors, and tracebacks are recorded live.
echo   - When Ninja Hub Desktop closes, ALL LOGS WILL REMAIN ON SCREEN.
echo =======================================================================
echo.

set ELECTRON_ENABLE_LOGGING=1
set ELECTRON_ENABLE_STACK_DUMPING=1

set LOGFILE=%~dp0debug_output.log
echo Log started at %TIME% > "%LOGFILE%"

if exist "%~dp0Ninja Hub Desktop 2.1.0.exe" (
    "%~dp0Ninja Hub Desktop 2.1.0.exe" --enable-logging --v=1 >> "%LOGFILE%" 2>&1
) else if exist "%~dp0Ninja Hub Desktop Setup 2.1.0.exe" (
    "%~dp0Ninja Hub Desktop Setup 2.1.0.exe" --enable-logging --v=1 >> "%LOGFILE%" 2>&1
) else if exist "%~dp0win-unpacked\Ninja Hub Desktop 2.1.0.exe" (
    "%~dp0win-unpacked\Ninja Hub Desktop 2.1.0.exe" --enable-logging --v=1 >> "%LOGFILE%" 2>&1
) else (
    echo [ERROR] Could not find 'Ninja Hub Desktop 2.1.0.exe' in this directory!
)

echo.
echo =======================================================================
echo APPLICATION CLOSED. PRINTING CAPTURED DEBUG LOGS BELOW:
echo =======================================================================
echo.
type "%LOGFILE%"
echo.
echo =======================================================================
echo END OF LOGS. You can select and copy any text above.
echo =======================================================================
echo.
pause
