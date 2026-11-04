@echo off
setlocal enabledelayedexpansion

echo ==========================================================
echo     CareerPath AI - Indian Career Intelligence System     
echo ==========================================================
echo.

set "PROJECT_ROOT=%~dp0"
set "BACKEND_DIR=%PROJECT_ROOT%backend"
set "FRONTEND_DIR=%PROJECT_ROOT%frontend"

REM 1. Check Ollama
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

REM Check if models exist in Ollama
where ollama >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    set "FOUND_MODEL=0"
    for /f "skip=1 tokens=*" %%m in ('ollama list 2^>nul') do (
        set "FOUND_MODEL=1"
    )
    if "!FOUND_MODEL!"=="0" (
        echo [INFO] No AI models detected in Ollama. Pulling recommended model gemma:2b...
        ollama pull gemma:2b
    )
)

REM 2. Check and Setup Backend Python Environment
echo.
echo [2/4] Checking Python environment...
if not exist "%BACKEND_DIR%\.venv\Scripts\python.exe" (
    echo Setting up Python virtual environment in backend\.venv...
    set "PYTHON_CMD="
    where python >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        set "PYTHON_CMD=python"
    ) else (
        where py >nul 2>&1
        if %ERRORLEVEL% EQU 0 (
            set "PYTHON_CMD=py"
        )
    )

    if not defined PYTHON_CMD (
        echo [ERROR] Python is not installed or not in PATH. Please install Python 3.10+ from python.org.
        pause
        exit /b 1
    )

    !PYTHON_CMD! -m venv "%BACKEND_DIR%\.venv"
    "%BACKEND_DIR%\.venv\Scripts\pip.exe" install --upgrade pip >nul 2>&1
    "%BACKEND_DIR%\.venv\Scripts\pip.exe" install -r "%BACKEND_DIR%\requirements.txt"
) else (
    "%BACKEND_DIR%\.venv\Scripts\python.exe" -c "import fastapi, uvicorn, pwdlib, jwt" >nul 2>&1
    if !ERRORLEVEL! NEQ 0 (
        echo Installing missing Python dependencies in backend\.venv...
        "%BACKEND_DIR%\.venv\Scripts\pip.exe" install -r "%BACKEND_DIR%\requirements.txt"
    )
)
echo [OK] Backend environment ready.

REM 3. Check and Setup Frontend Node Modules
echo.
echo [3/4] Checking Frontend dependencies...
if not exist "%FRONTEND_DIR%\node_modules" (
    echo Installing frontend dependencies via npm install...
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

REM 4. Launch Backend and Frontend
echo.
echo [4/4] Launching CareerPath AI services...

curl -s --connect-timeout 1 http://127.0.0.1:8000/health >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] FastAPI backend is already running on http://127.0.0.1:8000.
) else (
    echo Starting FastAPI backend on http://127.0.0.1:8000...
    start "CareerPath AI - Backend" cmd /c "cd /d "%BACKEND_DIR%" && "%BACKEND_DIR%\.venv\Scripts\python.exe" -m uvicorn main:app --host 0.0.0.0 --port 8000 || pause"
    
    REM Wait up to 10 seconds for backend to become healthy
    set "BACKEND_READY=0"
    for /l %%i in (1,1,10) do (
        curl -s --connect-timeout 1 http://127.0.0.1:8000/health >nul 2>&1
        if !ERRORLEVEL! EQU 0 (
            set "BACKEND_READY=1"
            goto :backend_ready
        )
        timeout /t 1 /nobreak >nul
    )
:backend_ready
    if "!BACKEND_READY!"=="1" (
        echo [OK] FastAPI backend ready.
    ) else (
        echo [NOTE] FastAPI backend is initializing...
    )
)

REM Free port 5173 if a previous orphaned instance was left running
for /f "tokens=5" %%p in ('netstat -aon 2^^^>nul ^^^| findstr ":5173 " ^^^| findstr "LISTENING"') do (
    taskkill /F /PID %%p >nul 2>&1
)

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
echo Press any key to stop all CareerPath AI services...
echo.
pause >nul

echo.
echo Stopping CareerPath AI services...
taskkill /F /FI "WINDOWTITLE eq CareerPath AI - Backend*" >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq CareerPath AI - Frontend*" >nul 2>&1
echo [OK] All services stopped cleanly.
timeout /t 2 /nobreak >nul
