# Copyright 2024 DeepMind Technologies Limited
#
# AlphaFold 3 source code is licensed under CC BY-NC-SA 4.0.
# Web GUI extension for local use.

"""Web GUI configuration for AlphaFold3."""

import os
import pathlib
from pydantic import BaseModel

# ── Data paths ──────────────────────────────────────────────────────────────
# The model parameters and genetic databases reside on an ext4 VHDX
# mounted inside WSL at /mnt/wsl/ext4data.
#
# When Docker Desktop WSL integration is enabled, the Linux ``docker``
# CLI can bind‑mount WSL paths directly — no translation needed.
# docker_runner.py auto‑detects whether the Linux or Windows Docker CLI
# is available and adjusts paths accordingly.
#
# Override with:  AF3_DATA_DIR=/other/path

_WSL_EXT4DATA = os.getenv("AF3_DATA_DIR", "/mnt/wsl/ext4data")
MODEL_DIR = _WSL_EXT4DATA                           # af3.bin.zst lives here
DB_DIR   = os.path.join(_WSL_EXT4DATA, "public_databases")

HOME = pathlib.Path.home()
# Jobs live on the VHDX so the container can access them (see docker_runner.py)
JOBS_DIR = (pathlib.Path(_WSL_EXT4DATA) / ".af3_jobs").as_posix()
DOCKER_EXE = "docker"
IMAGE_NAME = "alphafold3"


class RuntimeConfig(BaseModel):
    num_recycles: int = 10
    num_diffusion_samples: int = 5
    flash_attention: str = "triton"
    model_dir: str = "/root/models"
    db_dir: str = "/root/public_databases"
    docker_available: bool = False
    gpu_available: bool = False


_config = RuntimeConfig()


def get_config() -> RuntimeConfig:
    return _config


def get_db_dir() -> str:
    return DB_DIR


def get_model_dir() -> str:
    return MODEL_DIR
