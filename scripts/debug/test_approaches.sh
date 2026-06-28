#!/bin/bash

echo "=== Approach 1: --cap-add SYS_ADMIN with device ==="
DEV=$(mount | grep ext4data | cut -d' ' -f1)
CID=$(docker run -d --cap-add=SYS_ADMIN --device=${DEV}:/dev/vhdx:rw alphafold3 sh -c "
  mkdir -p /mnt/vhdx
  mount /dev/vhdx /mnt/vhdx 2>&1
  echo 'Content:'
  ls -la /mnt/vhdx/
  echo '---'
  ls -la /mnt/vhdx/af3.bin.zst 2>&1
  ls /mnt/vhdx/public_databases/ 2>&1 | head -5
  umount /mnt/vhdx 2>/dev/null
  echo 'DONE'
" 2>&1)
echo "CID=$CID"
if [ -n "$CID" ]; then
  sleep 5
  echo "--- logs ---"
  docker logs "$CID" 2>&1
  docker rm "$CID" 2>/dev/null
fi

echo ""
echo "=== Approach 2: Docker volume create ==="
docker volume create --driver local --opt type=none --opt device=/mnt/wsl/ext4data --opt o=bind af3_data 2>&1
echo "Volume created, testing..."
CID2=$(docker run -d -v af3_data:/mnt/data alphafold3 sh -c "
  ls -la /mnt/data/
  echo '---'
  ls -la /mnt/data/af3.bin.zst 2>&1
" 2>&1)
echo "CID=$CID2"
if [ -n "$CID2" ]; then
  sleep 5
  echo "--- logs ---"
  docker logs "$CID2" 2>&1
  docker rm "$CID2" 2>/dev/null
  docker volume rm af3_data 2>/dev/null
fi
