#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# Docker Socket Proxy Setup
# Creates a persistent proxy so the Docker CLI inside WSL can reach
# Docker Desktop when the native WSL integration is not available.
#
# Run once inside WSL Ubuntu:
#     bash setup_docker_proxy.sh
# ─────────────────────────────────────────────────────────────────────────────
set -e

PROXY_DST="/mnt/wsl/docker-desktop/shared-sockets/guest-services/docker.proxy.sock"
PROXY_SRC="/var/run/docker.sock"
PROXY_BIN="/usr/local/bin/docker-socket-proxy.py"

echo ""
echo "=== Docker Socket Proxy Setup ==="
echo ""

# ── Install the proxy script ───────────────────────────────────────────
echo "[1/3] Installing proxy script to $PROXY_BIN …"
sudo tee "$PROXY_BIN" > /dev/null << 'PYEOF'
#!/usr/bin/env python3
"""Forward /var/run/docker.sock → Docker Desktop proxy socket."""
import os, socket, sys, stat, threading, grp

SRC = "/var/run/docker.sock"
DST = "/mnt/wsl/docker-desktop/shared-sockets/guest-services/docker.proxy.sock"

def forward(src, dst):
    try:
        while True:
            data = src.recv(65536)
            if not data:
                break
            dst.sendall(data)
    except Exception:
        pass
    finally:
        try:
            src.close()
            dst.close()
        except Exception:
            pass

def handle(client):
    try:
        backend = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        backend.connect(DST)
        t1 = threading.Thread(target=forward, args=(client, backend), daemon=True)
        t2 = threading.Thread(target=forward, args=(backend, client), daemon=True)
        t1.start(); t2.start()
        t1.join(); t2.join()
    except Exception:
        pass

try:
    os.unlink(SRC)
except OSError:
    pass

server = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
server.bind(SRC)
os.chmod(SRC, stat.S_IRUSR | stat.S_IWUSR | stat.S_IRGRP | stat.S_IWGRP)
try:
    os.chown(SRC, 0, grp.getgrnam("docker").gr_gid)
except Exception:
    pass
server.listen(64)
print("[docker-proxy] ready", flush=True)

while True:
    client, _ = server.accept()
    threading.Thread(target=handle, args=(client,), daemon=True).start()
PYEOF
sudo chmod +x "$PROXY_BIN"
echo "   Done."

# ── Create systemd service ─────────────────────────────────────────────
echo "[2/3] Creating systemd service …"
sudo tee /etc/systemd/system/docker-socket-proxy.service > /dev/null << UNITEOF
[Unit]
Description=Docker Socket Proxy (WSL → Docker Desktop)
After=network.target

[Service]
Type=simple
ExecStart=/usr/bin/python3 $PROXY_BIN
Restart=always
RestartSec=2

[Install]
WantedBy=multi-user.target
UNITEOF

sudo systemctl daemon-reload
sudo systemctl enable docker-socket-proxy
echo "   Done."

# ── Start the proxy now ───────────────────────────────────────────────
echo "[3/3] Starting proxy …"
sudo systemctl start docker-socket-proxy
sleep 2

if [ -S "$PROXY_SRC" ]; then
    echo "   Proxy is running — socket at $PROXY_SRC"
    docker ps > /dev/null 2>&1 && echo "   Docker CLI works!" || echo "   Docker CLI may need sudo or docker group membership"
else
    echo "   WARNING: Socket not created — check 'systemctl status docker-socket-proxy'"
fi

echo ""
echo "=== Setup complete ==="
echo ""
echo "The Docker socket proxy will auto-start on WSL boot."
echo "You can now run the AlphaFold 3 web server:"
echo "  bash start_server.sh"
echo ""
