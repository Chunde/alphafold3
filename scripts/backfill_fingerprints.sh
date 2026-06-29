#!/bin/bash
cd /mnt/d/GitHub/alphafold3
.venv/bin/python3 << 'PYEOF'
import json, sys
sys.path.insert(0, ".")
from af3_webgui import config, dedup

jobs_file = "af3_webgui/jobs/jobs.json"
with open(jobs_file) as f:
    jobs = json.load(f)

count = 0
for j in jobs:
    if j["status"] != "completed" or not j.get("has_results"):
        continue
    jdir = f"/mnt/wsl/ext4data/.af3_jobs/{j['id']}"
    inp = f"{jdir}/input.json"
    try:
        with open(inp) as fh:
            input_json = json.load(fh)
        fp = dedup.compute_fingerprint(input_json, config.get_config().model_dump())
        dedup.register(fp, j["id"])
        count += 1
        print(f"Registered: {j['id']} ({j['name']})")
    except Exception as e:
        print(f"Skipped {j['id']}: {e}")

print(f"\nBackfilled {count} fingerprints")
PYEOF
