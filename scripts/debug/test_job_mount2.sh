#!/bin/bash
JOB_DIR="/mnt/d/GitHub/alphafold3/af3_webgui/jobs/dd8a0e4357ec"

echo "=== Host: full listing ==="
ls -la "$JOB_DIR/"
echo ""

echo "=== Container: find /mnt/test ==="
CID=$(docker create -v "${JOB_DIR}:/mnt/test" alphafold3 find /mnt/test/ -ls 2>&1)
echo "CID=$CID"
if [ -n "$CID" ]; then
  docker start "$CID" > /dev/null
  sleep 5
  docker logs "$CID" 2>&1
  docker rm "$CID" > /dev/null 2>&1
fi
echo ""

echo "=== Check mount in container ==="
CID2=$(docker create -v "${JOB_DIR}:/mnt/test" alphafold3 sh -c "mount | grep mnt; df -h /mnt/test" 2>&1)
echo "CID=$CID2"
if [ -n "$CID2" ]; then
  docker start "$CID2" > /dev/null
  sleep 5
  docker logs "$CID2" 2>&1
  docker rm "$CID2" > /dev/null 2>&1
fi
