"""Job deduplication — avoid re-running identical predictions.

We hash the computationally‑relevant fields of a job request to
produce a *fingerprint*.  If a previously completed job has the same
fingerprint the new job is linked to the existing output instead of
running again.
"""

from __future__ import annotations

import hashlib
import json
import os
import pathlib

import datetime as dt

_FP_INDEX_FILE = pathlib.Path(__file__).resolve().parent / "jobs" / "fingerprints.json"


# ── Fields that matter for reproducibility ────────────────────────────────
# Only these keys are used to build the fingerprint.  Cosmetic fields
# (name, creation time, …) are deliberately excluded.

_FP_KEYS = frozenset({
    "sequences",
    "modelSeeds",
    "numSamples",
    "bondedAtomPairs",
    "userCCD",
    "num_recycles",
    "flash_attention_implementation",
})


def compute_fingerprint(input_json: dict, config_dict: dict | None = None) -> str:
    """Return a hex SHA‑256 fingerprint for the computationally‑relevant
    subset of *input_json* and optional runtime *config_dict*."""
    data: dict[str, object] = {}
    for k in _FP_KEYS:
        if k in input_json:
            data[k] = input_json[k]
    if config_dict:
        for k in ("num_recycles", "flash_attention_implementation"):
            if k in config_dict and k in _FP_KEYS:
                data.setdefault(k, config_dict[k])
    # Canonical JSON — sorted keys, no trailing whitespace
    canonical = json.dumps(data, sort_keys=True, ensure_ascii=True)
    return hashlib.sha256(canonical.encode()).hexdigest()


# ── In‑memory index ───────────────────────────────────────────────────────
_index: dict[str, str] = {}   # fingerprint → job_id


def load_index() -> None:
    if _FP_INDEX_FILE.exists():
        _index.update(json.loads(_FP_INDEX_FILE.read_text()))


def save_index() -> None:
    _FP_INDEX_FILE.parent.mkdir(parents=True, exist_ok=True)
    _FP_INDEX_FILE.write_text(json.dumps(_index, indent=2))


def lookup(fingerprint: str) -> str | None:
    """Return the ``job_id`` of a previously completed job with this
    fingerprint, or ``None``."""
    return _index.get(fingerprint)


def register(fingerprint: str, job_id: str) -> None:
    _index[fingerprint] = job_id
    save_index()


# ── Symlink helper ────────────────────────────────────────────────────────

def link_output(source_job_id: str, target_job_id: str) -> None:
    """Make *target_job_id*'s output dir point to *source_job_id*'s."""
    jobs_root = pathlib.Path(os.getenv(
        "AF3_DATA_DIR", "/mnt/wsl/ext4data"
    )) / ".af3_jobs"
    src = jobs_root / source_job_id / "output"
    dst = jobs_root / target_job_id / "output"
    if dst.exists() or dst.is_symlink():
        dst.unlink() if dst.is_symlink() else os.rmdir(str(dst))
    os.symlink(str(src), str(dst))
