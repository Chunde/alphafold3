# Copyright 2024 DeepMind Technologies Limited
#
# AlphaFold 3 source code is licensed under CC BY-NC-SA 4.0.
# Web GUI extension for local use.

"""Web GUI configuration for AlphaFold3."""

import pathlib
from pydantic import BaseModel

# Paths
HOME = pathlib.Path.home()
MODEL_PATH = pathlib.Path("/mnt/ext4data/af3.bin.zst")
DB_DIR = "/mnt/dbdata/public_databases"
JOBS_DIR = pathlib.Path(__file__).resolve().parent / "jobs"
DOCKER_EXE = "/mnt/c/Program Files/Docker/Docker/resources/bin/docker.exe"
IMAGE_NAME = "alphafold3"


class RuntimeConfig(BaseModel):
    num_recycles: int = 10
    num_diffusion_samples: int = 5
    flash_attention: str = "triton"
    model_dir: str = "/mnt/data"
    db_dir: str = "/mnt/data/public_databases"
    docker_available: bool = False
    gpu_available: bool = False


_config = RuntimeConfig()


def get_config() -> RuntimeConfig:
    return _config


def get_db_dir() -> str:
    return DB_DIR


def get_model_path() -> str:
    return str(MODEL_PATH)
