#!/bin/bash
echo "=== Jobs ==="
cat /mnt/d/GitHub/alphafold3/af3_webgui/jobs/jobs.json | python3 -c "
import json,sys
for j in json.load(sys.stdin):
    print(f'{j[\"id\"]}  {j[\"status\"]:12s}  {j[\"name\"]}  results={j[\"has_results\"]}')
"

echo ""
echo "=== VHDX job dirs ==="
ls -la /mnt/wsl/ext4data/.af3_jobs/

echo ""
echo "=== Latest job output ==="
LATEST=$(ls -1d /mnt/wsl/ext4data/.af3_jobs/*/ 2>/dev/null | sort | tail -1)
echo "Dir: $LATEST"
ls -la "$LATEST"
echo ""
echo "=== Output contents ==="
ls -la "${LATEST}output/" 2>&1
echo ""
echo "=== Any CIF files? ==="
find "${LATEST}" -name "*.cif" 2>&1 | head -10
echo ""
echo "=== Any JSON files? ==="
find "${LATEST}" -name "*.json" 2>&1 | head -10
