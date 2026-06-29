#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# AlphaFold 3 — First‑time Setup
#
# Run once after cloning the repo to prepare everything the web GUI needs.
# Usage:   bash setup.sh
# ─────────────────────────────────────────────────────────────────────────────
set -eo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
ok()   { echo -e "  ${GREEN}OK${NC}  $1"; }
fail() { echo -e "  ${RED}FAIL${NC} $1"; }
info() { echo -e "  ${YELLOW}--${NC}  $1"; }

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

echo ""
echo "=== AlphaFold 3 Setup ==="
echo ""

# ── 1. Python venv ─────────────────────────────────────────────────────────
echo "[1/6] Python virtual environment"
if [ -x ".venv/bin/python3" ]; then
    ok "venv already exists"
else
    info "Creating venv …"
    python3 -m venv .venv
    ok "venv created"
fi

# ── 2. Install dependencies ────────────────────────────────────────────────
echo "[2/6] Core dependencies"
.venv/bin/python3 -m ensurepip 2>/dev/null || true
if .venv/bin/python3 -c "import alphafold3" 2>/dev/null; then
    ok "alphafold3 package already installed"
else
    info "Installing alphafold3 in editable mode …"
    .venv/bin/pip install -e . 2>/dev/null || \
        .venv/bin/python3 -m pip install -e .
    ok "alphafold3 installed"
fi

# ── 3. Web GUI dependencies ─────────────────────────────────────────────────
echo "[3/6] Web GUI dependencies"
for pkg in uvicorn fastapi pydantic; do
    if .venv/bin/python3 -c "import ${pkg//-/_}" 2>/dev/null; then
        ok "$pkg"
    else
        info "installing $pkg …"
        .venv/bin/python3 -m pip install "$pkg"
    fi
done

# ── 4. HMMER ────────────────────────────────────────────────────────────────
echo "[4/6] HMMER tools"
if command -v jackhmmer &>/dev/null; then
    ok "jackhmmer found"
else
    info "Installing HMMER …"
    sudo apt-get update -qq && sudo apt-get install -y -qq hmmer
    ok "HMMER installed"
fi

# ── 5. Generate CCD pickle files ────────────────────────────────────────────
echo "[5/6] CCD chemical component data"
if [ -f "src/alphafold3/constants/converters/ccd.pickle" ]; then
    SIZE=$(du -h src/alphafold3/constants/converters/ccd.pickle | cut -f1)
    ok "ccd.pickle present ($SIZE)"
else
    info "Generating ccd.pickle (this takes a minute) …"
    .venv/bin/python3 -c "from alphafold3.build_data import build_data; build_data()"
    ok "ccd.pickle generated"
fi

# ── 6. Model & databases check ──────────────────────────────────────────────
echo "[6/6] Model parameters & databases"
VHDX="/mnt/wsl/ext4data"
if [ -f "$VHDX/af3.bin.zst" ]; then
    ok "af3.bin.zst  ($(du -h "$VHDX/af3.bin.zst" | cut -f1))"
else
    fail "af3.bin.zst not found at $VHDX"
    info "Download from https://github.com/google-deepmind/alphafold3"
    info "and place at $VHDX/af3.bin.zst"
fi
if [ -d "$VHDX/public_databases" ]; then
    FASTAS=$(ls -1 "$VHDX/public_databases/"*.fasta "$VHDX/public_databases/"*.fa 2>/dev/null | wc -l)
    ok "$FASTAS database files"
else
    fail "Databases not found at $VHDX/public_databases"
    info "Run:  bash fetch_databases.sh $VHDX/public_databases"
fi

echo ""
echo "=== Setup complete ==="
echo ""
echo "Start the server:  bash start_server.sh"
echo ""
