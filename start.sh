#!/usr/bin/env bash
set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
OS="$(uname -s)"

# Track spawned background PIDs for graceful teardown
PIDS=()
cleanup() {
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

# 2. Start FastAPI Backend (with auto model detection & RAG)
echo "➜ Launching FastAPI backend on http://127.0.0.1:8000..."
if [ -f "$BACKEND_DIR/.venv/bin/uvicorn" ]; then
    UVICORN_BIN="$BACKEND_DIR/.venv/bin/uvicorn"
elif [ -f "$BACKEND_DIR/venv/bin/uvicorn" ]; then
    UVICORN_BIN="$BACKEND_DIR/venv/bin/uvicorn"
else
    UVICORN_BIN="uvicorn"
fi

"$UVICORN_BIN" main:app --host 127.0.0.1 --port 8000 --app-dir "$BACKEND_DIR" >/dev/null 2>&1 &
PIDS+=("$!")

# Verify backend health
for i in {1..10}; do
    if curl -s --connect-timeout 1 http://127.0.0.1:8000/health >/dev/null 2>&1; then
        break
    fi
    sleep 0.5
done
echo "✓ FastAPI backend ready."

# 3. Start Vite Frontend
echo "➜ Launching React frontend on http://127.0.0.1:5173..."
echo "➜ Open http://localhost:5173 in your browser!"
echo ""
echo "Press [Ctrl+C] anytime to stop all servers."
echo "----------------------------------------------------------"

cd "$FRONTEND_DIR"
npm run dev -- --host 127.0.0.1 --port 5173
