#!/bin/bash
# AlphaFold 3 Web GUI Startup Script
# Usage: inside WSL Ubuntu, run:  bash start_server.sh

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'
BOLD='\033[1m'

PROJECT_DIR="/mnt/d/GitHub/alphafold3"
VHDX_MOUNT="/mnt/wsl/ext4data"
HOST="0.0.0.0"
PORT="8000"

echo ""
echo -e "${BOLD}============================================${NC}"
echo -e "${BOLD} AlphaFold 3 Web GUI — Startup${NC}"
echo -e "${BOLD}============================================${NC}"

# ── 1. Verify VHDX is mounted ────────────────────────────────────────────
echo ""
echo -n "[1/4] Checking ext4 data mount... "
if [ -f "$VHDX_MOUNT/af3.bin.zst" ]; then
    echo -e "${GREEN}OK${NC}  ($VHDX_MOUNT)"
else
    echo -e "${YELLOW}NOT MOUNTED${NC}"
    echo "       Running: wsl --mount --vhd E:\\AlphaFold\\wsl_data.vhdx --name ext4data --partition 1"
    wsl.exe --mount --vhd "E:\\AlphaFold\\wsl_data.vhdx" --name ext4data --partition 1 2>/dev/null || true
    sleep 2
    if [ -f "$VHDX_MOUNT/af3.bin.zst" ]; then
        echo -e "       ${GREEN}Mount succeeded${NC}"
    else
        echo -e "       ${RED}Mount failed. Run manually:${NC}"
        echo "         wsl --mount --vhd E:\\AlphaFold\\wsl_data.vhdx --name ext4data --partition 1"
        exit 1
    fi
fi

# ── 2. Verify Docker Desktop is running ──────────────────────────────────
echo -n "[2/4] Checking Docker Desktop... "
if docker.exe ps > /dev/null 2>&1; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}DOCKER NOT RUNNING${NC}"
    echo "       Please start Docker Desktop, then re-run this script."
    exit 1
fi

# ── 3. Verify alphafold3 image exists ────────────────────────────────────
echo -n "[3/4] Checking alphafold3 image... "
if docker.exe images --format "{{.Repository}}" 2>/dev/null | grep -q "^alphafold3$"; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}NOT BUILT${NC}"
    echo "       Build it with:"
    echo "         cd /mnt/d/GitHub/alphafold3 && docker.exe build -t alphafold3 -f docker/Dockerfile ."
    exit 1
fi

# ── 4. GPU check ─────────────────────────────────────────────────────────
echo -n "[4/4] Checking GPU passthrough... "
if docker.exe run --rm --gpus all alphafold3 nvidia-smi > /dev/null 2>&1; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${YELLOW}UNAVAILABLE${NC}"
    echo "       GPU not accessible from Docker. Check NVIDIA driver and WSL GPU support."
    echo "       AlphaFold 3 requires a GPU — jobs will fail without one."
fi

# ── Start web GUI ─────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}============================================${NC}"
echo -e " ${GREEN}Starting web GUI${NC} → http://${HOST}:${PORT}"
echo -e "${BOLD}============================================${NC}"
echo ""

cd "$PROJECT_DIR"
exec python3 -m uvicorn af3_webgui.main:app --host "$HOST" --port "$PORT"
