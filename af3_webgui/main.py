"""AlphaFold3 Web GUI — FastAPI application."""

from __future__ import annotations

import asyncio
import json
import os
import pathlib
import uuid

from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse, FileResponse, JSONResponse, PlainTextResponse
from fastapi.staticfiles import StaticFiles

from . import config, docker_runner, output_parser
from .job_repo import JobRepo


repo = JobRepo()
_run_lock = asyncio.Lock()


async def _process_queue():
    """Run pending jobs one at a time."""
    while True:
        job = repo.get_pending()
        if not job:
            await asyncio.sleep(2)
            continue

        async with _run_lock:
            job = repo.get(job.id)
            if job is None or job.status != "pending":
                continue

            try:
                input_path = os.path.join(docker_runner.get_job_dir(job.id), "input.json")
                with open(input_path) as f:
                    input_json = json.load(f)
            except Exception:
                repo.update(job.id, status="failed", error_message="Cannot read input.json")
                await repo.save()
                continue

            await docker_runner.run_job(job.id, input_json, repo)

        await asyncio.sleep(1)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await repo.load()
    app.state.background_task = asyncio.create_task(_process_queue())
    # Health checks
    config.get_config().docker_available = await docker_runner.check_docker()
    if config.get_config().docker_available:
        config.get_config().gpu_available = await docker_runner.check_gpu()
    yield
    app.state.background_task.cancel()
    try:
        await app.state.background_task
    except asyncio.CancelledError:
        pass


app = FastAPI(lifespan=lifespan, title="AlphaFold3 Web GUI")

STATIC = pathlib.Path(__file__).resolve().parent / "static"
app.mount("/static", StaticFiles(directory=str(STATIC)), name="static")


@app.get("/", response_class=HTMLResponse)
async def index():
    return (STATIC / "index.html").read_text()


# ── Config ────────────────────────────────────────────────────────────────────

@app.get("/api/v1/config")
async def get_config():
    cfg = config.get_config()
    return cfg.model_dump()


@app.post("/api/v1/config")
async def update_config(body: dict[str, Any]):
    cfg = config.get_config()
    for k in ("num_recycles", "num_diffusion_samples", "flash_attention"):
        if k in body:
            setattr(cfg, k, body[k])
    return cfg.model_dump()


# ── Jobs ──────────────────────────────────────────────────────────────────────

@app.post("/api/v1/jobs")
async def submit_job(body: dict[str, Any]):
    name = body.get("name", "Unnamed")
    seeds = body.get("modelSeeds", [1])
    sequences = body.get("sequences", [])
    num_samples = body.get("numSamples", config.get_config().num_diffusion_samples)

    if not sequences:
        raise HTTPException(400, "At least one sequence is required")

    job = repo.create(name=name, num_seeds=len(seeds), num_samples=num_samples)

    input_json = {
        "name": name,
        "dialect": "alphafold3",
        "version": 4,
        "modelSeeds": seeds,
        "sequences": sequences,
    }
    if "bondedAtomPairs" in body:
        input_json["bondedAtomPairs"] = body["bondedAtomPairs"]
    if "userCCD" in body:
        input_json["userCCD"] = body["userCCD"]

    job_dir = docker_runner.get_job_dir(job.id)
    os.makedirs(os.path.join(job_dir, "output"), exist_ok=True)
    input_path = os.path.join(job_dir, "input.json")
    with open(input_path, "w") as f:
        json.dump(input_json, f)

    await repo.save()
    return job.model_dump()


@app.get("/api/v1/jobs")
async def list_jobs():
    return [j.model_dump() for j in repo.list_all()]


@app.get("/api/v1/jobs/{job_id}")
async def get_job(job_id: str):
    job = repo.get(job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    data = job.model_dump()
    if job.has_results:
        data["results"] = output_parser.parse_job_results(job_id)
    return data


@app.post("/api/v1/jobs/{job_id}/cancel")
async def cancel_job(job_id: str):
    job = repo.get(job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    if job.status not in ("running", "pending"):
        raise HTTPException(400, f"Cannot cancel job in status {job.status}")
    await docker_runner.cancel_job(job_id, repo)
    return {"status": "cancelled"}


@app.get("/api/v1/jobs/{job_id}/logs")
async def get_logs(job_id: str):
    job = repo.get(job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    logs = await docker_runner.get_logs(job_id)
    return PlainTextResponse(logs)


# ── Results ───────────────────────────────────────────────────────────────────

@app.get("/api/v1/jobs/{job_id}/results")
async def get_results(job_id: str):
    job = repo.get(job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    return output_parser.parse_job_results(job_id)


@app.get("/api/v1/jobs/{job_id}/results/top/model.cif")
async def get_top_cif(job_id: str):
    path = output_parser.get_top_result_path(job_id, "cif")
    if not path:
        raise HTTPException(404, "Top-ranked CIF not found")
    return FileResponse(path, media_type="chemical/x-cif", filename="model.cif")


@app.get("/api/v1/jobs/{job_id}/results/top/confidences.json")
async def get_top_confidences(job_id: str):
    path = output_parser.get_top_result_path(job_id, "confidences")
    if not path:
        raise HTTPException(404, "Confidences not found")
    return FileResponse(path, media_type="application/json", filename="confidences.json")


@app.get("/api/v1/jobs/{job_id}/results/{seed}/{sample}/model.cif")
async def get_sample_cif(job_id: str, seed: int, sample: int):
    path = output_parser.get_result_file_path(job_id, seed, sample, "cif")
    if not path:
        raise HTTPException(404, "CIF not found")
    return FileResponse(path, media_type="chemical/x-cif", filename="model.cif")


@app.get("/api/v1/jobs/{job_id}/results/{seed}/{sample}/confidences.json")
async def get_sample_confidences(job_id: str, seed: int, sample: int):
    path = output_parser.get_result_file_path(job_id, seed, sample, "confidences")
    if not path:
        raise HTTPException(404, "Confidences not found")
    return FileResponse(path, media_type="application/json", filename="confidences.json")
