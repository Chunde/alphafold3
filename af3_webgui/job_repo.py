"""Job repository — in-memory store with JSON persistence."""

from __future__ import annotations

import datetime
import json
import pathlib
import uuid

from pydantic import BaseModel

JOBS_FILE = pathlib.Path(__file__).resolve().parent / "jobs" / "jobs.json"


class JobRecord(BaseModel):
    id: str
    name: str
    status: str  # pending, running, completed, failed, cancelled
    created_at: str
    started_at: str | None = None
    finished_at: str | None = None
    num_seeds: int = 1
    num_samples: int = 5
    error_message: str | None = None
    has_results: bool = False
    result_samples: list[dict] = []


class JobRepo:
    def __init__(self):
        self._jobs: dict[str, JobRecord] = {}

    async def load(self):
        if JOBS_FILE.exists():
            data = json.loads(JOBS_FILE.read_text())
            for j in data:
                record = JobRecord(**j)
                if record.status == "running":
                    record.status = "failed"
                    record.error_message = "Server restarted while running"
                self._jobs[record.id] = record

    async def save(self):
        data = [j.model_dump() for j in self._jobs.values()]
        JOBS_FILE.parent.mkdir(parents=True, exist_ok=True)
        JOBS_FILE.write_text(json.dumps(data, indent=2))

    def create(self, name: str, num_seeds: int = 1, num_samples: int = 5) -> JobRecord:
        job = JobRecord(
            id=uuid.uuid4().hex[:12],
            name=name,
            status="pending",
            created_at=datetime.datetime.now().isoformat(),
            num_seeds=num_seeds,
            num_samples=num_samples,
        )
        self._jobs[job.id] = job
        return job

    def get(self, job_id: str) -> JobRecord | None:
        return self._jobs.get(job_id)

    def list_all(self) -> list[JobRecord]:
        return sorted(
            self._jobs.values(), key=lambda j: j.created_at, reverse=True
        )

    def update(self, job_id: str, **kwargs):
        job = self._jobs[job_id]
        if "status" in kwargs and kwargs["status"] != job.status:
            new_status = kwargs["status"]
            if new_status == "running":
                kwargs.setdefault("started_at", datetime.datetime.now().isoformat())
            elif new_status in ("completed", "failed", "cancelled"):
                kwargs.setdefault("finished_at", datetime.datetime.now().isoformat())
        for k, v in kwargs.items():
            setattr(job, k, v)
        self._jobs[job_id] = job

    def delete(self, job_id: str):
        if job_id in self._jobs:
            del self._jobs[job_id]

    def get_running(self) -> JobRecord | None:
        for j in self._jobs.values():
            if j.status == "running":
                return j
        return None

    def get_pending(self) -> JobRecord | None:
        for j in self._jobs.values():
            if j.status == "pending":
                return j
        return None
