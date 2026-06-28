#!/bin/bash
JOB_DIR="/mnt/wsl/ext4data/.af3_jobs/d8939827c44f"
echo "JOB_DIR=$JOB_DIR"
echo "exists=$(test -d "$JOB_DIR" && echo YES || echo NO)"
echo "=== Files ==="
ls -la "$JOB_DIR/" 2>&1
echo ""
echo "=== input.json ==="
cat "$JOB_DIR/input.json" 2>&1
echo ""
echo "=== runner.log ==="
cat "$JOB_DIR/runner.log" 2>&1
echo ""
echo "=== container.log (head) ==="
cat "$JOB_DIR/container.log" 2>&1 | head -20
