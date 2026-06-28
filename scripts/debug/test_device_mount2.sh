#!/bin/bash
set -e

DEV=$(mount | grep ext4data | cut -d' ' -f1)
echo "VHDX device: $DEV"

echo "=== Create and run container with VHDX device ==="
CID=$(docker run -d --device=${DEV}:/dev/vhdx:rw alphafold3 sh -c "
  mkdir -p /mnt/vhdx
  mount /dev/vhdx /mnt/vhdx 2>&1
  echo '=== Content of VHDX ==='
  ls -la /mnt/vhdx/
  echo ''
  echo '=== Model file ==='
  ls -la /mnt/vhdx/af3.bin.zst 2>&1 || echo 'NO MODEL FILE'
  echo ''
  echo '=== Databases ==='
  ls /mnt/vhdx/public_databases/ 2>&1 | head -5
  umount /mnt/vhdx 2>/dev/null
  echo 'DONE'
" 2>&1)
echo "CID=$CID"

if [ -n "$CID" ]; then
  sleep 5
  echo ""
  echo "=== Container logs ==="
  docker logs "$CID" 2>&1
  docker rm "$CID" 2>/dev/null
fi
