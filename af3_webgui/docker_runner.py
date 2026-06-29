"""AlphaFold3 job runner — runs AF3 directly in WSL without Docker.

Model parameters and databases are on the VHDX at /mnt/wsl/ext4data.
"""

from __future__ import annotations

import asyncio
import datetime
import json
import os
import pathlib
import shutil
import subprocess

from . import config, dedup
from .job_repo import JobRepo


# ═══════════════════════════════════════════════════════════════════════════
# Paths
# ═══════════════════════════════════════════════════════════════════════════

_PROJECT_DIR = pathlib.Path(__file__).resolve().parent.parent
_VENV_PYTHON = str(_PROJECT_DIR / ".venv" / "bin" / "python3")
_RUN_SCRIPT = str(_PROJECT_DIR / "run_alphafold.py")


def _find_python() -> str:
    """Return the best Python interpreter (venv > system)."""
    if os.path.exists(_VENV_PYTHON):
        return _VENV_PYTHON
    return shutil.which("python3") or "python3"


PYTHON_EXE = _find_python()


# ═══════════════════════════════════════════════════════════════════════════
# Job directory
# ═══════════════════════════════════════════════════════════════════════════

_VHDX_JOBS = os.path.join(config._WSL_EXT4DATA, ".af3_jobs")


def get_job_dir(job_id: str) -> str:
    return os.path.join(_VHDX_JOBS, job_id)


# ═══════════════════════════════════════════════════════════════════════════
# Health checks (still check Docker/GPU for the config UI)
# ═══════════════════════════════════════════════════════════════════════════

async def check_docker() -> bool:
    """Check if the Python environment and GPU are available."""
    try:
        proc = await asyncio.create_subprocess_exec(
            PYTHON_EXE, "-c", "import jax; print(jax.devices())",
            stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
        )
        out, _ = await proc.communicate()
        return b"CudaDevice" in (out or b"")
    except Exception:
        return False


async def check_gpu() -> bool:
    """Check if JAX can see the GPU."""
    try:
        proc = await asyncio.create_subprocess_exec(
            PYTHON_EXE, "-c", "import jax; print(jax.devices())",
            stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
        )
        out, _ = await proc.communicate()
        return b"CudaDevice" in (out or b"")
    except Exception:
        return False


# ═══════════════════════════════════════════════════════════════════════════
# Job runner
# ═══════════════════════════════════════════════════════════════════════════

async def run_job(job_id: str, input_json: dict, repo: JobRepo):
    """Run AlphaFold 3 directly in WSL as a subprocess."""
    job_dir = get_job_dir(job_id)
    os.makedirs(os.path.join(job_dir, "output"), exist_ok=True)

    input_path = os.path.join(job_dir, "input.json")
    with open(input_path, "w") as f:
        json.dump(input_json, f)

    job = repo.get(job_id)
    cfg = config.get_config()
    samples = job.num_samples if job and job.num_samples else cfg.num_diffusion_samples

    cmd = [
        PYTHON_EXE, _RUN_SCRIPT,
        "--json_path", input_path,
        "--model_dir", config.MODEL_DIR,
        "--db_dir", config.DB_DIR,
        "--output_dir", os.path.join(job_dir, "output"),
        f"--num_recycles={cfg.num_recycles}",
        f"--num_diffusion_samples={samples}",
        f"--flash_attention_implementation={cfg.flash_attention}",
        "--jax_compilation_cache_dir=/tmp/jax_cache",
    ]

    runner_log_path = os.path.join(job_dir, "runner.log")
    log_path = os.path.join(job_dir, "container.log")

    with open(runner_log_path, "w") as f:
        f.write(f"=== AlphaFold3 Direct Runner ===\n")
        f.write(f"Started: {datetime.datetime.now().isoformat()}\n")
        f.write(f"Python:  {PYTHON_EXE}\n")
        f.write(f"Script:  {_RUN_SCRIPT}\n")
        f.write(f"Command: {' '.join(cmd)}\n\n")

    repo.update(job_id, status="running")
    await repo.save()

    try:
        # Run AF3 directly — 48‑hour timeout
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
        )

        stdout, _ = await asyncio.wait_for(
            proc.communicate(), timeout=172800  # 48 hours
        )

        with open(log_path, "wb") as f:
            f.write(stdout or b"")

        exit_code = proc.returncode or 0

        with open(runner_log_path, "a") as f:
            f.write(f"Finished: {datetime.datetime.now().isoformat()}\n")
            f.write(f"Exit code: {exit_code}\n")

        if exit_code == 0:
            repo.update(job_id, status="completed", has_results=True)
            # Register fingerprint so identical future jobs hit the cache
            try:
                fp = dedup.compute_fingerprint(input_json, config.get_config().model_dump())
                dedup.register(fp, job_id)
            except Exception:
                pass
        else:
            repo.update(
                job_id, status="failed",
                error_message=f"Exit code {exit_code}",
                has_results=True,
            )
        await repo.save()

    except asyncio.TimeoutError:
        with open(runner_log_path, "a") as f:
            f.write(f"Timeout at: {datetime.datetime.now().isoformat()}\n")
        try:
            proc.terminate()
        except Exception:
            pass
        repo.update(job_id, status="failed", error_message="Timeout (48 hours)")
        await repo.save()
    except Exception as e:
        with open(runner_log_path, "a") as f:
            f.write(f"Exception: {type(e).__name__}: {e}\n")
        repo.update(job_id, status="failed", error_message=f"{type(e).__name__}: {e}")
        await repo.save()


async def cancel_job(job_id: str, repo: JobRepo):
    """Cancel a running job (find and kill the process)."""
    # Look for the python process running this job
    try:
        subprocess.run(
            ["pkill", "-f", f"run_alphafold.py.*{job_id}"],
            timeout=10
        )
    except Exception:
        pass
    repo.update(job_id, status="cancelled")
    await repo.save()


async def get_logs(job_id: str) -> str:
    """Get job logs from the saved log file."""
    log_path = os.path.join(get_job_dir(job_id), "container.log")
    if os.path.exists(log_path):
        with open(log_path, "r", errors="replace") as f:
            return f.read()
    return "No logs available"
