#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# AlphaFold 3 — WSL Auto‑mount Setup
#
# Ensures the ext4 VHDX data disk is automatically mounted whenever WSL
# starts.  Run once from inside WSL Ubuntu:
#
#     bash setup_wsl_automount.sh
#
# This script:
#   1. Adds a boot command to /etc/wsl.conf that attaches the VHDX
#   2. Verifies the mount works
# ─────────────────────────────────────────────────────────────────────────────
set -e

VHDX_FILE="E:\\AlphaFold\\wsl_data.vhdx"
VHDX_MOUNT="/mnt/wsl/ext4data"
VHDX_SENTINEL="$VHDX_MOUNT/af3.bin.zst"

echo ""
echo "=== AlphaFold 3 — WSL Auto‑mount Setup ==="
echo ""

# ── 1. Mount the VHDX now if needed ────────────────────────────────────────
if [ -f "$VHDX_SENTINEL" ]; then
    echo "[✓] VHDX already mounted at $VHDX_MOUNT"
else
    echo "[ ] Mounting VHDX …"
    wsl.exe --mount --vhd "$VHDX_FILE" --name ext4data --partition 1
    sleep 3
    if [ -f "$VHDX_SENTINEL" ]; then
        echo "[✓] VHDX mounted successfully"
    else
        echo "[✗] Mount failed.  Run manually:"
        echo "    wsl --mount --vhd $VHDX_FILE --name ext4data --partition 1"
        exit 1
    fi
fi

# ── 2. Configure persistent auto‑mount via /etc/fstab ──────────────────────
# In WSL2, once the VHDX is attached to the VM it remains available.
# We add an fstab entry so it's re‑mounted when the kernel re‑scans.
FSTAB_ENTRY="/dev/sdd1  $VHDX_MOUNT  ext4  defaults,nofail  0  2"

# Check current device
CURRENT_DEV=$(df "$VHDX_MOUNT" --output=source 2>/dev/null | tail -1)
echo "[ ] Current device backing $VHDX_MOUNT : ${CURRENT_DEV:-unknown}"

if [ -n "$CURRENT_DEV" ] && [ "$CURRENT_DEV" != "Filesystem" ]; then
    FSTAB_ENTRY="$CURRENT_DEV  $VHDX_MOUNT  ext4  defaults,nofail  0  2"
fi

if grep -q "$VHDX_MOUNT" /etc/fstab 2>/dev/null; then
    echo "[✓] /etc/fstab already has an entry for $VHDX_MOUNT"
else
    echo "[ ] Adding fstab entry …"
    echo "$FSTAB_ENTRY" | sudo tee -a /etc/fstab > /dev/null
    echo "[✓] fstab entry added"
fi

# ── 3. Set up a boot‑time mount trigger ────────────────────────────────────
# wsl.conf [boot] can run a command when the distro boots.
# We use this to ensure the VHDX is attached (via wsl.exe interop).
BOOT_SCRIPT="/etc/wsl-boot-mount.sh"

sudo tee "$BOOT_SCRIPT" > /dev/null << 'BOOTEOF'
#!/bin/bash
# WSL boot script — ensure VHDX data disk is attached and mounted
VHDX_MOUNT="/mnt/wsl/ext4data"
SENTINEL="$VHDX_MOUNT/af3.bin.zst"

if [ -f "$SENTINEL" ]; then
    exit 0  # Already mounted
fi

# Try to mount it via the Windows-side wsl.exe
if command -v wsl.exe &>/dev/null; then
    wsl.exe --mount --vhd "E:\\AlphaFold\\wsl_data.vhdx" \
        --name ext4data --partition 1 2>/dev/null || true
fi
# If the device is present but not mounted, fstab takes care of it
mount "$VHDX_MOUNT" 2>/dev/null || true
BOOTEOF

sudo chmod +x "$BOOT_SCRIPT"

# Update wsl.conf [boot] section
WSL_CONF="/etc/wsl.conf"
if grep -q "^command=" "$WSL_CONF" 2>/dev/null; then
    echo "[✓] wsl.conf already has a boot command"
else
    echo "[ ] Adding boot command to wsl.conf …"
    sudo tee -a "$WSL_CONF" > /dev/null <<< ""
    sudo tee -a "$WSL_CONF" > /dev/null <<< "[boot]"
    sudo tee -a "$WSL_CONF" > /dev/null <<< "command = $BOOT_SCRIPT"
    echo "[✓] wsl.conf updated"
fi

echo ""
echo "=== Setup complete ==="
echo ""
echo "The VHDX will now auto‑mount when WSL starts."
echo "To verify, you can restart WSL with:"
echo "  wsl --shutdown"
echo "  wsl -d Ubuntu"
echo "  ls $VHDX_MOUNT/af3.bin.zst"
echo ""
