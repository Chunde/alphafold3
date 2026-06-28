# Deploy AlphaFold 3 on WSL

Deploy and manage the AlphaFold 3 web service on a WSL2 Ubuntu workstation with a VHDX-backed ext4 data disk.

## What this skill covers

- Starting/stopping the AF3 web GUI
- Troubleshooting GPU, VHDX, or path issues
- Setting up the environment from scratch
- Understanding the architecture (direct-run, no Docker for jobs)

## Quick start

The service is started from **inside WSL Ubuntu** (not PowerShell):

```bash
bash /mnt/d/GitHub/alphafold3/start_server.sh
```

Web GUI at `http://localhost:8001` (or the next available port if 8001 is busy).

## Architecture

AlphaFold 3 runs **directly in WSL without Docker** for job execution. The web GUI (FastAPI) manages a job queue and spawns AF3 as a Python subprocess using the project's `.venv`.

- **Model & databases**: ext4 VHDX at `/mnt/wsl/ext4data/`
- **Job workspace**: `/mnt/wsl/ext4data/.af3_jobs/`
- **GPU**: JAX/CUDA direct access (RTX 4090 Laptop)
- **HMMER**: apt package (jackhmmer, hmmsearch, hmmalign)

See [[af3-wsl-architecture]] for the full component layout.

## Key files

| File | Purpose |
|---|---|
| `start_server.sh` | Single-command launcher |
| `af3_webgui/docker_runner.py` | AF3 subprocess launcher (no Docker — name is historical) |
| `af3_webgui/config.py` | Paths and runtime config |
| `af3_webgui/main.py` | FastAPI app with job queue |
| `setup_windows_automount.ps1` | Windows scheduled task for VHDX auto-mount |
| `setup_wsl_automount.sh` | WSL fstab + boot config for VHDX |

## Troubleshooting

### Service won't start

```bash
# Check port is free
ss -tlnp | grep 8001

# Check venv has uvicorn
/mnt/d/GitHub/alphafold3/.venv/bin/python3 -c "import uvicorn"

# If not:
/mnt/d/GitHub/alphafold3/.venv/bin/python3 -m pip install uvicorn fastapi
```

### GPU not detected

```bash
nvidia-smi                                    # Should show RTX 4090
.venv/bin/python3 -c "import jax; print(jax.devices())"  # Should show [CudaDevice(id=0)]
```

### VHDX not mounted

```bash
ls /mnt/wsl/ext4data/af3.bin.zst              # Should exist
# If not:
wsl --mount --vhd "E:\AlphaFold\wsl_data.vhdx" --name ext4data --partition 1
```

### Job failed — check logs

```bash
cat /mnt/wsl/ext4data/.af3_jobs/<job_id>/runner.log
cat /mnt/wsl/ext4data/.af3_jobs/<job_id>/container.log
```

## Full deployment from scratch

See [[af3-deploy-steps]] for step-by-step instructions covering:
1. Python venv setup
2. HMMER installation
3. VHDX creation and formatting
4. Database download
5. Auto-mount configuration
6. Service startup

## Lessons learned

See [[af3-lessons-learned]] for a record of problems encountered and why Docker was abandoned for job execution in favor of direct WSL subprocesses.
