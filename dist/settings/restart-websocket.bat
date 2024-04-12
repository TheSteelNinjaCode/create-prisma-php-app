@echo off
set PORT=8080
set "PHP_PATH=php"
set "SERVER_SCRIPT_PATH= src\Lib\Websocket\server.php"

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

:: Ensure the previous command's failure does not prevent the server from starting
:: Wait a bit to ensure the port is freed
timeout /t 2

:: Start the WebSocket server
echo [INFO] Starting WebSocket server on port %PORT%...
%PHP_PATH% %SERVER_SCRIPT_PATH%
if %ERRORLEVEL% == 0 (
    echo [SUCCESS] WebSocket server started.
) else (
    echo [ERROR] Failed to start WebSocket server.
)