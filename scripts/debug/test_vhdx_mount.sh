#!/bin/bash
echo "=== Test VHDX mount: /mnt/wsl/ext4data ==="
echo "--- Host listing ---"
ls -la /mnt/wsl/ext4data/
echo ""

echo "=== Docker run with VHDX bind mount ==="
docker run --rm -v /mnt/wsl/ext4data:/mnt/data alphafold3 sh -c "
  echo 'Files in /mnt/data:'
  ls -la /mnt/data/
  echo ''
  echo 'Model file:'
  ls -la /mnt/data/af3.bin.zst
  echo ''
  echo 'Databases:'
  ls /mnt/data/public_databases/ | head -5
  echo ''
  echo 'Disk usage:'
  df -h /mnt/data
" 2>&1
echo ""
echo "EXIT: $?"
echo "DONE"
