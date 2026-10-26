@echo off
setlocal

cd /d "%~dp0"

set LOG=dispatcher.log

echo. >> "%LOG%"
echo ===================================================== >> "%LOG%"
echo [%date% %time%] Starting dispatcher >> "%LOG%"
echo ===================================================== >> "%LOG%"

node index.mjs >> "%LOG%" 2>&1

set EXIT=%ERRORLEVEL%
echo [%date% %time%] Finished with exit code %EXIT% >> "%LOG%"

exit /b %EXIT%