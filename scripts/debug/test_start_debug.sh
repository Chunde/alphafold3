#!/bin/bash
set -e

echo "=== Test 1: Simple create + start (no flags) ==="
CID=$(docker create alphafold3 echo hello 2>&1)
echo "Created: $CID"
timeout 10 docker start "$CID" 2>&1 && echo "START OK" || echo "START FAILED/TIMEOUT"
docker wait "$CID" 2>&1
docker logs "$CID" 2>&1
docker rm "$CID" 2>/dev/null
echo ""

echo "=== Test 2: create + start with --gpus all ==="
CID=$(docker create --gpus all alphafold3 echo hello 2>&1)
echo "Created: $CID"
timeout 10 docker start "$CID" 2>&1 && echo "START OK" || echo "START FAILED/TIMEOUT"
docker wait "$CID" 2>&1
docker logs "$CID" 2>&1
docker rm "$CID" 2>/dev/null
echo ""

echo "=== Test 3: create + start with --cap-add=SYS_ADMIN (no --device) ==="
CID=$(docker create --gpus all --cap-add=SYS_ADMIN alphafold3 echo hello 2>&1)
echo "Created: $CID"
timeout 10 docker start "$CID" 2>&1 && echo "START OK" || echo "START FAILED/TIMEOUT"
docker wait "$CID" 2>&1
docker logs "$CID" 2>&1
docker rm "$CID" 2>/dev/null
echo ""

echo "=== Test 4: create + start with --device ==="
DEV=$(mount | grep ext4data | cut -d' ' -f1)
CID=$(docker create --gpus all --cap-add=SYS_ADMIN --device=${DEV}:/dev/vhdx:rw alphafold3 echo hello 2>&1)
echo "Created: $CID"
timeout 10 docker start "$CID" 2>&1 && echo "START OK" || echo "START FAILED/TIMEOUT"
docker wait "$CID" 2>&1
docker logs "$CID" 2>&1
docker rm "$CID" 2>/dev/null
