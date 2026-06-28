# AlphaFold 3 Web GUI — REST API

Base URL: `http://<host>:8001`

## Endpoints

### GET `/api/v1/config`
Get runtime configuration.

**Response:**
```json
{
  "num_recycles": 10,
  "num_diffusion_samples": 5,
  "flash_attention": "triton",
  "model_dir": "/root/models",
  "db_dir": "/root/public_databases",
  "docker_available": true,
  "gpu_available": true
}
```

### POST `/api/v1/config`
Update runtime configuration (applies to future jobs).

**Body:**
```json
{
  "num_recycles": 20,
  "num_diffusion_samples": 3,
  "flash_attention": "triton"
}
```

---

### POST `/api/v1/jobs`
Submit a new folding job.

**Body:**
```json
{
  "name": "MyProtein",
  "modelSeeds": [1],
  "numSamples": 5,
  "sequences": [
    {
      "protein": {
        "id": "A",
        "sequence": "EAREEWLRRGAERSGEPAPE"
      }
    }
  ]
}
```

**Response** (201):
```json
{
  "id": "a1b2c3d4e5f6",
  "name": "MyProtein",
  "status": "pending",
  "created_at": "2026-06-28T14:12:38",
  "num_seeds": 1,
  "num_samples": 5,
  "has_results": false
}
```

### GET `/api/v1/jobs`
List all jobs, newest first.

### GET `/api/v1/jobs/{id}`
Get job details. When `status` is `completed`, includes a `results` field.

**Response** (completed job):
```json
{
  "id": "a1b2c3d4e5f6",
  "name": "MyProtein",
  "status": "completed",
  "created_at": "2026-06-28T14:12:38",
  "started_at": "2026-06-28T14:12:40",
  "finished_at": "2026-06-28T14:21:54",
  "num_seeds": 1,
  "num_samples": 5,
  "has_results": true,
  "results": {
    "samples": [
      {
        "seed": 1,
        "sample_idx": 0,
        "dir_name": "seed-1_sample-0",
        "has_cif": true,
        "has_confidences": true,
        "metrics": {
          "plddt": 85.3,
          "ptm": 0.72,
          "iptm": 0.65,
          "ranking_score": 0.69
        }
      }
    ],
    "top": {
      "has_cif": true,
      "has_summary": true,
      "has_confidences": true,
      "metrics": { "plddt": 85.3, "ptm": 0.72, "iptm": 0.65, "ranking_score": 0.69 }
    },
    "has_results": true
  }
}
```

Job status values: `pending` → `running` → `completed` / `failed` / `cancelled`

### POST `/api/v1/jobs/{id}/cancel`
Cancel a pending or running job.

### GET `/api/v1/jobs/{id}/logs`
Get container log output as plain text.

---

### GET `/api/v1/jobs/{id}/results`
Return parsed results (same structure as `results` field in job detail).

### GET `/api/v1/jobs/{id}/results/top/model.cif`
Download the top-ranked mmCIF structure file.

### GET `/api/v1/jobs/{id}/results/top/confidences.json`
Download the confidence scores for the top-ranked prediction.

### GET `/api/v1/jobs/{id}/results/{seed}/{sample}/model.cif`
Download a specific sample's mmCIF. Example: `/api/v1/jobs/a1b2/1/0/model.cif`

### GET `/api/v1/jobs/{id}/results/{seed}/{sample}/confidences.json`
Download a specific sample's confidence scores.

---

## Input JSON format

Follows the official [AlphaFold 3 input spec](https://github.com/google-deepmind/alphafold3/blob/main/docs/input.md).

### Protein
```json
{"protein": {"id": "A", "sequence": "EAREEWLRRGAERSGEPAPE"}}
```

### RNA
```json
{"rna": {"id": "B", "sequence": "GCAUUGCA", "modifications": []}}
```

### DNA
```json
{"dna": {"id": "C", "sequence": "GATTACA", "modifications": []}}
```

### Ligand (SMILES)
```json
{"ligand": {"id": "D", "smiles": "CC(=O)OC1=CC=CC=C1C(=O)O", "ccdCodes": []}}
```

### Ligand (CCD code)
```json
{"ligand": {"id": "E", "ccdCodes": ["ATP"]}}
```

### Ion
```json
{"ion": {"id": "F", "charge": 2, "element": "Mg"}}
```

### Multi-chain example
```json
{
  "name": "Protein-RNA complex",
  "modelSeeds": [1, 42],
  "numSamples": 3,
  "sequences": [
    {"protein": {"id": "A", "sequence": "MKFLILFNILV"}},
    {"rna": {"id": "B", "sequence": "AGCUAGCU", "modifications": []}}
  ],
  "bondedAtomPairs": [
    [["A", 3, "CB"], ["B", 1, "OP1"]]
  ]
}
```

## Python client example

```python
import requests
import time

BASE = "http://localhost:8001"

# Submit
resp = requests.post(f"{BASE}/api/v1/jobs", json={
    "name": "my-fold",
    "modelSeeds": [1],
    "sequences": [
        {"protein": {"id": "A", "sequence": "EAREEWLRRGAERSGEPAPE"}}
    ]
}).json()
job_id = resp["id"]
print(f"Job submitted: {job_id}")

# Poll until done
while True:
    job = requests.get(f"{BASE}/api/v1/jobs/{job_id}").json()
    print(f"Status: {job['status']}")
    if job["status"] in ("completed", "failed", "cancelled"):
        break
    time.sleep(30)

# Download top result
if job["has_results"]:
    cif = requests.get(f"{BASE}/api/v1/jobs/{job_id}/results/top/model.cif")
    with open("result.cif", "w") as f:
        f.write(cif.text)
    print("Saved result.cif")
```

## curl example (bash)

```bash
#!/bin/bash
BASE="http://localhost:8001"

# Submit job
JOB=$(curl -s -X POST "$BASE/api/v1/jobs" \
  -H "Content-Type: application/json" \
  -d '{"name":"test","modelSeeds":[1],"sequences":[{"protein":{"id":"A","sequence":"EAREEWLRRGAERSGEPAPE"}}]}')
JOB_ID=$(echo "$JOB" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
echo "Job: $JOB_ID"

# Wait
while true; do
  STATUS=$(curl -s "$BASE/api/v1/jobs/$JOB_ID" | python3 -c "import sys,json; print(json.load(sys.stdin)['status'])")
  echo "Status: $STATUS"
  [[ "$STATUS" == "completed" || "$STATUS" == "failed" ]] && break
  sleep 30
done

# Download
curl -s "$BASE/api/v1/jobs/$JOB_ID/results/top/model.cif" -o result.cif
echo "Done"
```
