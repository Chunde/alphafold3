#!/bin/bash
set -e
echo "=== Create container ==="
RESP=$(curl -s --unix-socket /var/run/docker.sock -X POST \
  -H "Content-Type: application/json" \
  -d '{"Image":"alphafold3","Cmd":["echo","hello_test"]}' \
  http://localhost/containers/create)
echo "$RESP"
CID=$(echo "$RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['Id'][:12])")
echo "CID=$CID"

echo "=== Start ==="
curl -s --unix-socket /var/run/docker.sock -X POST http://localhost/containers/$CID/start

sleep 3
echo "=== Logs ==="
curl -s --unix-socket /var/run/docker.sock "http://localhost/containers/$CID/logs?stdout=1&stderr=1"

echo ""
echo "=== Cleanup ==="
curl -s --unix-socket /var/run/docker.sock -X DELETE http://localhost/containers/$CID
echo "DONE"
