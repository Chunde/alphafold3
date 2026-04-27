"""Docker container lifecycle management for AlphaFold3 jobs."""

from __future__ import annotations

import asyncio
import json
import os
import shutil

from . import config
from .job_repo import JobRepo

DOCKER_EXE = config.DOCKER_EXE


async def check_docker() -> bool:
    cmd = [DOCKER_EXE, "ps"]
    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
        )
        await proc.communicate()
        return proc.returncode == 0
    except Exception:
        return False


async def check_gpu() -> bool:
    cmd = [
        DOCKER_EXE, "run", "--rm", "--gpus", "all",
        config.IMAGE_NAME, "nvidia-smi"
    ]
    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
        )
        await proc.communicate()
        return proc.returncode == 0
    except Exception:
        return False


def get_job_dir(job_id: str) -> str:
    jobs_root = str(config.JOBS_DIR)
    return os.path.join(jobs_root, job_id)


async def run_job(job_id: str, input_json: dict, repo: JobRepo):
    job_dir = get_job_dir(job_id)
    os.makedirs(os.path.join(job_dir, "output"), exist_ok=True)

    input_path = os.path.join(job_dir, "input.json")
    with open(input_path, "w") as f:
        json.dump(input_json, f)

    job = repo.get(job_id)
    cfg = config.get_config()

    samples = job.num_samples if job and job.num_samples else cfg.num_diffusion_samples
    cmd = [
        DOCKER_EXE, "run", "--gpus", "all", "--rm",
        "--name", f"af3_{job_id}",
        "-v", f"{job_dir}:/mnt/job",
        "-v", f"/mnt/dbdata:/mnt/data",
        "-v", f"/mnt/dbdata/af3.bin.zst:/mnt/data/af3.bin.zst",
        config.IMAGE_NAME,
        "python", "run_alphafold.py",
        "--json_path=/mnt/job/input.json",
        "--model_dir=/mnt/data",
        "--db_dir=/mnt/data/public_databases",
        "--output_dir=/mnt/job/output",
        f"--num_recycles={cfg.num_recycles}",
        f"--num_diffusion_samples={samples}",
        f"--flash_attention_implementation={cfg.flash_attention}",
        "--jax_compilation_cache_dir=/tmp/jax_cache",
    ]

    repo.update(job_id, status="running")
    await repo.save()

    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
        )
        stdout, stderr = await asyncio.wait_for(
            proc.communicate(), timeout=172800
        )

        log_path = os.path.join(job_dir, "container.log")
        with open(log_path, "wb") as f:
            f.write(stdout or b"")
            f.write(stderr or b"")

        if proc.returncode == 0:
            repo.update(job_id, status="completed", has_results=True)
        else:
            repo.update(
                job_id, status="failed",
                error_message=f"Exit code {proc.returncode}",
                has_results=True,
            )
        await repo.save()
    except asyncio.TimeoutError:
        try:
            await _stop_container(job_id)
        except Exception:
            pass
        repo.update(job_id, status="failed", error_message="Timeout (48 hours)")
        await repo.save()
    except Exception as e:
        repo.update(job_id, status="failed", error_message=str(e))
        await repo.save()


async def _stop_container(job_id: str):
    cmd = [DOCKER_EXE, "stop", f"af3_{job_id}"]
    proc = await asyncio.create_subprocess_exec(
        *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
    )
    await proc.communicate()


async def cancel_job(job_id: str, repo: JobRepo):
    try:
        await _stop_container(job_id)
    except Exception:
        pass
    repo.update(job_id, status="cancelled")
    await repo.save()


async def get_logs(job_id: str) -> str:
    """Get container logs from the log file."""
    log_path = os.path.join(get_job_dir(job_id), "container.log")
    if os.path.exists(log_path):
        with open(log_path, "r", errors="replace") as f:
            return f.read()
    # Try docker logs
    cmd = [DOCKER_EXE, "logs", f"af3_{job_id}"]
    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
        )
        stdout, stderr = await proc.communicate()
        return (stdout or b"").decode(errors="replace") + (stderr or b"").decode(errors="replace")
    except Exception:
        return "No logs available"
