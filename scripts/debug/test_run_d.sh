#!/bin/bash
set -e
DEV=$(mount | grep ext4data | cut -d' ' -f1)
echo "VHDX device: $DEV"

JOB_ID="test123"
echo "=== Test docker run -d ==="
CID=$(docker run -d --gpus all --cap-add=SYS_ADMIN --device=${DEV}:${DEV}:rw alphafold3 sh -c "
  mkdir -p /root/models
  mount $DEV /root/models 2>&1
  echo '--- VHDX Content ---'
  ls -la /root/models/
  echo '--- Model ---'
  ls -la /root/models/af3.bin.zst
  echo 'DONE'
" 2>&1)
echo "CID=$CID"

if [ -n "$CID" ]; then
  echo "=== Wait for container ==="
  docker wait "$CID" 2>&1

  echo "=== Logs ==="
  docker logs "$CID" 2>&1

  echo "=== Exit code ==="
  docker inspect -f '{{.State.ExitCode}}' "$CID" 2>&1

  docker rm "$CID" 2>/dev/null
fi
