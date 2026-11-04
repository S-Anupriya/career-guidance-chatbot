#!/usr/bin/env bash
set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
OS="$(uname -s)"

# Track spawned background PIDs for graceful teardown
PIDS=()
cleanup() {
    trap - SIGINT SIGTERM EXIT
    echo ""
    echo "➜ Stopping CareerPath AI servers..."
    for pid in "${PIDS[@]}"; do
        if kill -0 "$pid" 2>/dev/null; then
            kill -15 "$pid" 2>/dev/null || true
        fi
    done
    wait 2>/dev/null || true
    echo "✓ All services stopped cleanly."
}

trap cleanup SIGINT SIGTERM EXIT

echo "=========================================================="
echo "    CareerPath AI — Indian Career Intelligence System     "
echo "=========================================================="

# 1. Ensure Ollama is reachable (macOS & Linux auto-detection)
if ! curl -s --connect-timeout 1 http://127.0.0.1:11434/api/tags >/dev/null 2>&1; then
    echo "➜ Starting local Ollama service..."
    if [ "$OS" = "Darwin" ]; then
        if [ -d "/Applications/Ollama.app" ]; then
            open -a Ollama
        else
            ollama serve >/dev/null 2>&1 &
            PIDS+=("$!")
        fi
    else
        # Linux: check if system models exist in /var/lib/ollama
        if [ -d "/var/lib/ollama" ]; then
            env OLLAMA_MODELS=/var/lib/ollama ollama serve >/dev/null 2>&1 &
        else
            ollama serve >/dev/null 2>&1 &
        fi
        PIDS+=("$!")
    fi

    # Wait up to 6 seconds for Ollama to accept requests
    for i in {1..12}; do
        if curl -s --connect-timeout 1 http://127.0.0.1:11434/api/tags >/dev/null 2>&1; then
            break
        fi
        sleep 0.5
    done
fi
echo "✓ Ollama engine ready."

# Check if any model exists in Ollama
if command -v ollama >/dev/null 2>&1; then
    MODEL_COUNT=$(ollama list 2>/dev/null | tail -n +2 | grep -v '^[[:space:]]*$' | wc -l || echo "0")
    if [ "$MODEL_COUNT" -eq 0 ]; then
        echo "➜ No AI model found in local Ollama. Downloading lightweight recommended model (gemma:2b)..."
        ollama pull gemma:2b || echo "⚠ Could not auto-download model. Run 'ollama pull gemma:2b' manually."
    fi
fi

# 2. Check and Setup Backend Python Environment
if [ ! -f "$BACKEND_DIR/.venv/bin/uvicorn" ] && [ ! -f "$BACKEND_DIR/venv/bin/uvicorn" ]; then
    echo "➜ Initializing backend Python virtual environment..."
    python3 -m venv "$BACKEND_DIR/.venv"
    "$BACKEND_DIR/.venv/bin/pip" install --upgrade pip >/dev/null 2>&1 || true
    "$BACKEND_DIR/.venv/bin/pip" install -r "$BACKEND_DIR/requirements.txt"
fi

if [ -f "$BACKEND_DIR/.venv/bin/python" ]; then
    PYTHON_BIN="$BACKEND_DIR/.venv/bin/python"
    PIP_BIN="$BACKEND_DIR/.venv/bin/pip"
elif [ -f "$BACKEND_DIR/venv/bin/python" ]; then
    PYTHON_BIN="$BACKEND_DIR/venv/bin/python"
    PIP_BIN="$BACKEND_DIR/venv/bin/pip"
else
    PYTHON_BIN="python3"
    PIP_BIN="pip3"
fi

# Ensure required libraries are importable
if ! "$PYTHON_BIN" -c "import fastapi, uvicorn, pwdlib, jwt" >/dev/null 2>&1; then
    echo "➜ Installing missing Python dependencies..."
    "$PIP_BIN" install -r "$BACKEND_DIR/requirements.txt"
fi

echo "➜ Launching FastAPI backend with dynamic port discovery..."
rm -f "$BACKEND_DIR/.active_port"
(cd "$BACKEND_DIR" && "$PYTHON_BIN" run.py > "$BACKEND_DIR/backend.log" 2>&1) &
PIDS+=("$!")

# Wait for .active_port to be written
BACKEND_PORT=8000
for i in {1..20}; do
    if [ -f "$BACKEND_DIR/.active_port" ]; then
        BACKEND_PORT=$(cat "$BACKEND_DIR/.active_port" 2>/dev/null || echo "8000")
        break
    fi
    sleep 0.25
done

# Verify backend health on dynamic port
BACKEND_HEALTHY=0
for i in {1..20}; do
    if curl -s --connect-timeout 1 "http://127.0.0.1:$BACKEND_PORT/health" >/dev/null 2>&1; then
        BACKEND_HEALTHY=1
        break
    fi
    sleep 0.5
done

if [ "$BACKEND_HEALTHY" -eq 1 ]; then
    echo "✓ FastAPI backend dynamically ready on port $BACKEND_PORT."
else
    echo "⚠ FastAPI backend starting up. Check $BACKEND_DIR/backend.log:"
    tail -n 15 "$BACKEND_DIR/backend.log" 2>/dev/null || true
fi

# 3. Check and Setup Frontend Dependencies
if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
    echo "➜ Installing frontend dependencies (npm install)..."
    (cd "$FRONTEND_DIR" && npm install)
fi

echo "=========================================================="
echo "  ✓ CareerPath AI is NOW RUNNING!"
echo "  ➜ Local Web Interface: http://127.0.0.1:5173"
echo ""
echo "  ⚠ DO NOT PRESS Ctrl+C OR CLOSE THIS TERMINAL!"
echo "  Keep this window open in the background while using the app."
echo "=========================================================="

# Auto-open browser on macOS / Linux
if [ "$OS" = "Darwin" ]; then
    (sleep 1.2 && open "http://127.0.0.1:5173") >/dev/null 2>&1 &
elif command -v xdg-open >/dev/null 2>&1; then
    (sleep 1.2 && xdg-open "http://127.0.0.1:5173") >/dev/null 2>&1 &
fi

cd "$FRONTEND_DIR"
npm run dev -- --host 127.0.0.1 --port 5173
