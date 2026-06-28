#!/bin/bash
set -e

# Find VHDX block device
DEV=$(mount | grep ext4data | cut -d' ' -f1)
echo "VHDX device: $DEV"

# Test: pass device to container and mount it there
docker run --rm --device=${DEV}:/dev/vhdx:rw alphafold3 sh -c "
  mkdir -p /mnt/vhdx
  mount /dev/vhdx /mnt/vhdx 2>&1
  echo '=== Content of VHDX ==='
  ls -la /mnt/vhdx/
  echo ''
  echo '=== Model file ==='
  ls -la /mnt/vhdx/af3.bin.zst 2>&1 || echo 'NO MODEL FILE'
  echo ''
  echo '=== Databases ==='
  ls /mnt/vhdx/public_databases/ 2>&1 | head -5
  echo ''
  umount /mnt/vhdx 2>/dev/null
  echo DONE
" 2>&1
