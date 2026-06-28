#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# AlphaFold 3 Web GUI — Startup Script
#
# Single‑command launcher for the AlphaFold 3 web service on WSL2 + Docker
# Desktop.  Handles VHDX auto‑mount, Docker health checks, GPU validation,
# and WSL‑integration configuration.
#
# Usage:   bash start_server.sh            (from any directory)
#          bash start_server.sh --setup    (first‑time setup)
#
# The VHDX at  E:\AlphaFold\wsl_data.vhdx  holds the AlphaFold model
# parameters and genetic databases on a high‑speed ext4 filesystem.
# ─────────────────────────────────────────────────────────────────────────────

set -eo pipefail

# ── Colours ─────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

# ── Configurable knobs ─────────────────────────────────────────────────────
# VHDX file on the Windows side
VHDX_FILE="E:\\AlphaFold\\wsl_data.vhdx"
# Where the VHDX appears once mounted inside WSL
VHDX_MOUNT="/mnt/wsl/ext4data"
# Sentinel file that must exist inside the VHDX (proves it's the right disk)
VHDX_SENTINEL="$VHDX_MOUNT/af3.bin.zst"
# WSL distro name (as shown by `wsl --list`)
WSL_DISTRO="Ubuntu"

HOST="0.0.0.0"
PORT="8001"

# If the default port is busy, pick the next available one
while ss -tlnp 2>/dev/null | grep -q ":$PORT "; do
    PORT=$((PORT + 1))
done
if [ "$PORT" != "8001" ]; then
    info "Port 8001 is busy — using port $PORT instead"
fi

# Project directory — auto‑detected
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

SETUP_MODE=false
[[ "${1:-}" == "--setup" ]] && SETUP_MODE=true

# ── Helper functions ────────────────────────────────────────────────────────
say()   { echo -e "$@"; }
ok()    { echo -e "  ${GREEN}✓${NC} $1"; }
warn()  { echo -e "  ${YELLOW}⚠${NC} $1"; }
fail()  { echo -e "  ${RED}✗${NC} $1"; }
info()  { echo -e "  ${BLUE}ℹ${NC} $1"; }
banner(){ echo -e "\n${BOLD}━━━ $* ━━━${NC}"; }

die() {
    echo -e "\n${RED}${BOLD}FATAL:${NC} $1"
    exit 1
}

# Run a command inside the WSL distro — outputs to stderr, returns exit code
_wsl() {
    wsl.exe -d "$WSL_DISTRO" -- bash -c "$*" 2>&1
}

# ── Header ──────────────────────────────────────────────────────────────────
clear 2>/dev/null || true
echo ""
echo -e "${BOLD}╔════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║   AlphaFold 3 Web GUI — Startup           ║${NC}"
echo -e "${BOLD}║   $(date +'%Y-%m-%d %H:%M:%S')                       ║${NC}"
echo -e "${BOLD}╚════════════════════════════════════════════╝${NC}"
echo ""
info "Project dir : $PROJECT_DIR"
if $SETUP_MODE; then
    info "Mode         : first‑time setup"
fi

# ═══════════════════════════════════════════════════════════════════════════
# STEP 1 — VHDX mount
# ═══════════════════════════════════════════════════════════════════════════
banner "Step 1/5 — VHDX data disk"

if [ -f "$VHDX_SENTINEL" ]; then
    ok "VHDX already mounted at $VHDX_MOUNT"
else
    warn "VHDX not mounted — attempting auto‑mount …"
    info "Running: wsl --mount --vhd $VHDX_FILE --name ext4data --partition 1"

    if wsl.exe --mount --vhd "$VHDX_FILE" --name ext4data --partition 1 2>/dev/null; then
        sleep 3
        if [ -f "$VHDX_SENTINEL" ]; then
            ok "VHDX mounted successfully"
        else
            fail "Mount command succeeded but sentinel file not found"
            info "Please check the VHDX at: $VHDX_FILE"
            info "Run manually and retry:"
            echo ""
            echo "  wsl --mount --vhd $VHDX_FILE --name ext4data --partition 1"
            echo ""
            die "Cannot proceed without database disk"
        fi
    else
        fail "Auto‑mount failed"
        echo ""
        info "Manual mount command:"
        echo "  wsl --mount --vhd $VHDX_FILE --name ext4data --partition 1"
        die "Cannot proceed without database disk"
    fi
fi

# Show what's available
DISK_SIZE=$(df -h "$VHDX_MOUNT" 2>/dev/null | tail -1 | awk '{print $2}')
DISK_USED=$(df -h "$VHDX_MOUNT" 2>/dev/null | tail -1 | awk '{print $3}')
DISK_AVAIL=$(df -h "$VHDX_MOUNT" 2>/dev/null | tail -1 | awk '{print $4}')
info "Disk: ${DISK_SIZE:-?} total, ${DISK_USED:-?} used, ${DISK_AVAIL:-?} free"

MODEL_FILE="$VHDX_MOUNT/af3.bin.zst"
DB_DIR="$VHDX_MOUNT/public_databases"
if [ -f "$MODEL_FILE" ]; then
    ok "Model:   af3.bin.zst  ($(du -h "$MODEL_FILE" 2>/dev/null | cut -f1))"
else
    fail "Model file not found: $MODEL_FILE"
    die "Missing model parameters"
fi
if [ -d "$DB_DIR" ]; then
    DB_COUNT=$(ls -1 "$DB_DIR"/*.fasta "$DB_DIR"/*.fa 2>/dev/null | wc -l)
    ok "Databases: $DB_COUNT FASTA files in public_databases/"
else
    fail "Database directory not found: $DB_DIR"
    die "Missing genetic databases"
fi

# ═══════════════════════════════════════════════════════════════════════════
# STEP 2 — Python environment
# ═══════════════════════════════════════════════════════════════════════════
banner "Step 2/3 — Python environment"

VENV_PYTHON="$PROJECT_DIR/.venv/bin/python3"
if [ -x "$VENV_PYTHON" ]; then
    ok "venv Python: $VENV_PYTHON"
    PY_VER=$("$VENV_PYTHON" --version 2>&1)
    info "$PY_VER"
else
    fail "venv not found at $VENV_PYTHON"
    info "Create it with: uv venv && uv pip install -e ."
    die "Python venv required"
fi

# ═══════════════════════════════════════════════════════════════════════════
# STEP 3 — CUDA / GPU check
# ═══════════════════════════════════════════════════════════════════════════
banner "Step 3/3 — GPU availability"

if nvidia-smi >/dev/null 2>&1; then
    GPU_NAME=$(nvidia-smi --query-gpu=name --format=csv,noheader 2>/dev/null | head -1)
    ok "GPU accessible: ${GPU_NAME:-NVIDIA GPU}"
else
    warn "GPU not accessible"
    warn "AlphaFold 3 requires a GPU — jobs will fail without one"
fi

# Check JAX can see the GPU
if "$VENV_PYTHON" -c "import jax; assert any('cuda' in str(d).lower() for d in jax.devices())" 2>/dev/null; then
    ok "JAX sees CUDA GPU"
else
    warn "JAX cannot see GPU — jobs may fail"
fi

# ═══════════════════════════════════════════════════════════════════════════
# Launch
# ═══════════════════════════════════════════════════════════════════════════
echo ""
echo -e "${BOLD}════════════════════════════════════════════════${NC}"
echo -e " ${GREEN}${BOLD}Starting AlphaFold 3 Web GUI${NC}"
echo -e " ${BOLD}→  http://${HOST}:${PORT}${NC}"
echo -e "${BOLD}════════════════════════════════════════════════${NC}"
echo ""
echo -e "Press ${BOLD}Ctrl+C${NC} to stop the server."
echo ""

cd "$PROJECT_DIR"
exec "$VENV_PYTHON" -m uvicorn af3_webgui.main:app --host "$HOST" --port "$PORT"
