@echo off
setlocal enabledelayedexpansion

echo ==========================================================
echo     CareerPath AI - Indian Career Intelligence System     
echo ==========================================================
echo.

set "PROJECT_ROOT=%~dp0"
set "BACKEND_DIR=%PROJECT_ROOT%backend"
set "FRONTEND_DIR=%PROJECT_ROOT%frontend"

:: 1. Check Ollama
echo [1/4] Checking Ollama service...
curl -s --connect-timeout 1 http://127.0.0.1:11434/api/tags >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Starting local Ollama...
    where ollama >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        start "" /B ollama serve >nul 2>&1
        timeout /t 3 /nobreak >nul
    ) else (
        echo [NOTE] Ollama CLI not found in PATH. If you have Ollama installed, please open the Ollama app.
    )
)
echo [OK] Ollama ready.

:: Check if models exist in Ollama
where ollama >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    set "FOUND_MODEL=0"
    for /f "skip=1 tokens=*" %%m in ('ollama list 2^>nul') do (
        set "FOUND_MODEL=1"
    )
    if "!FOUND_MODEL!"=="0" (
        echo [INFO] No AI models detected in Ollama. Pulling recommended lightweight model (gemma:2b)...
        ollama pull gemma:2b
    )
)

:: 2. Check and Setup Backend Python Environment
echo.
echo [2/4] Checking Python environment...
if not exist "%BACKEND_DIR%\.venv\Scripts\uvicorn.exe" (
    echo Setting up Python virtual environment in backend\.venv...
    where python >nul 2>&1
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Python is not installed or not in PATH. Please install Python 3.10+ from python.org.
        pause
        exit /b 1
    )
    python -m venv "%BACKEND_DIR%\.venv"
    "%BACKEND_DIR%\.venv\Scripts\pip.exe" install -r "%BACKEND_DIR%\requirements.txt"
)
echo [OK] Backend environment ready.

:: 3. Check and Setup Frontend Node Modules
echo.
echo [3/4] Checking Frontend dependencies...
if not exist "%FRONTEND_DIR%\node_modules" (
    echo Installing frontend dependencies (npm install)...
    where npm >nul 2>&1
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Node.js/npm is not installed. Please install Node.js 18+ from nodejs.org.
        pause
        exit /b 1
    )
    cd /d "%FRONTEND_DIR%"
    call npm install
    cd /d "%PROJECT_ROOT%"
)
echo [OK] Frontend packages ready.

:: 4. Launch Backend and Frontend
echo.
echo [4/4] Launching CareerPath AI services...
echo Starting FastAPI backend on http://127.0.0.1:8000...
start "CareerPath AI - Backend" /MIN cmd /c "cd /d "%BACKEND_DIR%" && "%BACKEND_DIR%\.venv\Scripts\uvicorn.exe" main:app --host 127.0.0.1 --port 8000"

echo Starting React frontend on http://127.0.0.1:5173...
start "CareerPath AI - Frontend" cmd /c "cd /d "%FRONTEND_DIR%" && npm run dev -- --host 127.0.0.1 --port 5173"

timeout /t 3 /nobreak >nul
echo.
echo ==========================================================
echo [SUCCESS] CareerPath AI is running!
echo Opening http://localhost:5173 in your default browser...
echo ==========================================================
start http://localhost:5173

echo.
echo Keep this command prompt open while using the app.
echo Close this window to stop.
echo.
pause
