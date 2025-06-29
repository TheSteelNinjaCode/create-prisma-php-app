@echo off
set PORT=8080
set "PHP_PATH=php"
set "SERVER_SCRIPT_PATH=websocket-server.php"

echo [INFO] Checking for processes using port %PORT%...
netstat -aon | findstr :%PORT%

for /f "tokens=5" %%a in ('netstat -aon ^| findstr :%PORT%') do (
    echo [INFO] Found PID: %%a
    taskkill /F /PID %%a
    if %ERRORLEVEL% == 0 (
        echo [SUCCESS] Killed process %%a.
    ) else (
        echo [ERROR] Failed to kill process %%a.
    )
)

:: Wait to ensure the port is freed
timeout /t 2 >nul

echo [INFO] Starting WebSocket server on port %PORT%...
%PHP_PATH% %SERVER_SCRIPT_PATH%
if %ERRORLEVEL% == 0 (
    echo [SUCCESS] WebSocket server started.
) else (
    echo [ERROR] Failed to start WebSocket server.
)