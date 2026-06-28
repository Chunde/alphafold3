#!/bin/bash
set -e
DEV=$(mount | grep ext4data | cut -d' ' -f1)
echo "VHDX device: $DEV"

echo "=== docker create ==="
CID=$(docker create --gpus all --cap-add=SYS_ADMIN --device=${DEV}:/dev/vhdx:rw alphafold3 sh -c "
  mkdir -p /root/models
  mount /dev/vhdx /root/models 2>&1
  echo '--- VHDX Content ---'
  ls -la /root/models/
  echo '--- Model ---'
  ls -la /root/models/af3.bin.zst
  echo 'DONE'
" 2>&1)
echo "CID=$CID"

echo ""
echo "=== docker start (ignore error) ==="
docker start "$CID" 2>/dev/null || true
echo "Started"

echo ""
echo "=== docker wait ==="
docker wait "$CID" 2>&1

echo ""
echo "=== docker logs ==="
docker logs "$CID" 2>&1

echo ""
echo "=== cleanup ==="
docker rm "$CID" 2>/dev/null
echo "DONE"
