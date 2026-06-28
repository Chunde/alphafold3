#!/bin/bash
set -e
DEV=$(mount | grep ext4data | cut -d' ' -f1)
echo "VHDX device: $DEV"

echo "=== Approach 1: --privileged (no --device) ==="
CID=$(docker run -d --gpus all --privileged alphafold3 sh -c "
  mkdir -p /root/models
  mount $DEV /root/models 2>&1
  echo 'Content:'
  ls /root/models/af3.bin.zst
  echo 'DONE'
" 2>&1)
echo "CID=$CID"
if [ -n "$CID" ] && [ "$CID" != "null" ]; then
  docker wait "$CID" 2>&1
  echo "--- logs ---"
  docker logs "$CID" 2>&1
  docker rm "$CID" 2>/dev/null
fi
