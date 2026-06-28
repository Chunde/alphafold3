#!/bin/bash
echo "Test 1: ls /mnt/data/"
docker run --rm -v /mnt/wsl/ext4data:/mnt/data alphafold3 ls -la /mnt/data/ 2>&1
echo "exit=$?"

echo ""
echo "Test 2: echo test"
docker run --rm alphafold3 echo HELLO 2>&1
echo "exit=$?"

echo ""
echo "Test 3: Run -d then logs"
CID=$(docker run -d -v /mnt/wsl/ext4data:/mnt/data alphafold3 ls -la /mnt/data/ 2>&1)
echo "CID=$CID"
if [ -n "$CID" ]; then
  sleep 5
  docker logs "$CID" 2>&1
  docker rm "$CID" 2>/dev/null
fi
