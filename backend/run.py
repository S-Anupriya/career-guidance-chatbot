import os
import sys
import socket
from pathlib import Path
import uvicorn

def find_free_port(start_port=8000, max_attempts=50) -> int:
    """Find the first available TCP port starting from start_port."""
    for port in range(start_port, start_port + max_attempts):
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
                s.bind(("0.0.0.0", port))
                return port
        except OSError:
            continue
    return start_port

if __name__ == "__main__":
    requested_port = int(os.getenv("PORT", 8000))
    port = find_free_port(requested_port)

    # Persist the active port so Vite, client scripts, and launchers know where to proxy
    active_port_file = Path(__file__).resolve().parent / ".active_port"
    try:
        active_port_file.write_text(str(port), encoding="utf-8")
    except Exception as e:
        print(f"Warning: could not write .active_port file: {e}", file=sys.stderr)

    print(f"➜ CareerPath AI Backend dynamically bound to port: {port}")
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
