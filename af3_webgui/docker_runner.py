"""Docker container lifecycle management for AlphaFold3 jobs."""

from __future__ import annotations

import asyncio
import datetime
import json
import os
import shutil

from . import config
from .job_repo import JobRepo


def _find_docker() -> str:
    """Find the docker executable. Prefers the Windows docker.exe for path translation."""
    # When running under WSL2, the Linux 'docker' can't connect to the daemon.
    # Use the Windows docker.exe instead, which is accessible via WSL interop.
    windows_docker = "/mnt/c/Program Files/Docker/Docker/resources/bin/docker.exe"
    if os.path.exists(windows_docker):
        return windows_docker
    # Fall back to PATH
    docker = shutil.which("docker")
    if docker:
        return docker
    return "docker"


DOCKER_EXE = _find_docker()


def _to_windows_path(wsl_path: str) -> str:
    """Convert a WSL2 /mnt/ path to a Windows path for Docker Desktop volume mounts."""
    if wsl_path.startswith("/mnt/"):
        drive = wsl_path[5].upper()
        rest = wsl_path[6:].replace("/", "\\")
        return f"{drive}:{rest}"
    return wsl_path


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

    # Convert to Windows paths for Docker Desktop volume mounts
    docker_job_dir = _to_windows_path(job_dir)
    docker_model_dir = str(config.MODEL_DIR)  # Already Windows path
    docker_db_dir = str(config.DB_DIR)        # Already Windows path

    samples = job.num_samples if job and job.num_samples else cfg.num_diffusion_samples
    cmd = [
        DOCKER_EXE, "run", "--gpus", "all", "--rm",
        "--name", f"af3_{job_id}",
        "-v", f"{docker_job_dir}:/mnt/job",
        "-v", f"{docker_model_dir}:/root/models",
        "-v", f"{docker_db_dir}:/root/public_databases",
        config.IMAGE_NAME,
        "python", "/app/alphafold/run_alphafold.py",
        "--json_path=/mnt/job/input.json",
        "--model_dir=/root/models",
        "--db_dir=/root/public_databases",
        "--output_dir=/mnt/job/output",
        f"--num_recycles={cfg.num_recycles}",
        f"--num_diffusion_samples={samples}",
        f"--flash_attention_implementation={cfg.flash_attention}",
        "--jax_compilation_cache_dir=/tmp/jax_cache",
    ]

    # Write runner log for debugging
    runner_log_path = os.path.join(job_dir, "runner.log")
    with open(runner_log_path, "w") as f:
        f.write(f"=== AlphaFold3 Runner ===\n")
        f.write(f"Started: {datetime.datetime.now().isoformat()}\n")
        f.write(f"Command: {' '.join(cmd)}\n\n")

    repo.update(job_id, status="running")
    await repo.save()

    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
        )
        with open(runner_log_path, "a") as f:
            f.write(f"Subprocess created, PID: {proc.pid}\n")

        stdout, stderr = await asyncio.wait_for(
            proc.communicate(), timeout=172800
        )

        log_path = os.path.join(job_dir, "container.log")
        with open(log_path, "wb") as f:
            f.write(stdout or b"")
            f.write(stderr or b"")

        with open(runner_log_path, "a") as f:
            f.write(f"Finished: {datetime.datetime.now().isoformat()}\n")
            f.write(f"Return code: {proc.returncode}\n")

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
        with open(runner_log_path, "a") as f:
            f.write(f"Timeout at: {datetime.datetime.now().isoformat()}\n")
        try:
            await _stop_container(job_id)
        except Exception:
            pass
        repo.update(job_id, status="failed", error_message="Timeout (48 hours)")
        await repo.save()
    except Exception as e:
        with open(runner_log_path, "a") as f:
            f.write(f"Exception: {type(e).__name__}: {e}\n")
        repo.update(job_id, status="failed", error_message=f"{type(e).__name__}: {e}")
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
