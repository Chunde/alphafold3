#!/bin/bash
JOB_DIR="/mnt/d/GitHub/alphafold3/af3_webgui/jobs/dd8a0e4357ec"

echo "Host file check:"
ls -la "$JOB_DIR/input.json"
echo ""

echo "=== docker run test ==="
docker run --rm -v "${JOB_DIR}:/mnt/test" alphafold3 ls -la /mnt/test/ 2>&1
echo "exit: $?"
echo ""

echo "=== docker create test ==="
CID=$(docker create -v "${JOB_DIR}:/mnt/test" alphafold3 ls -la /mnt/test/ 2>&1)
echo "CID=$CID"
if [ -n "$CID" ]; then
  docker start "$CID"
  sleep 5
  docker logs "$CID"
  docker rm "$CID"
fi
