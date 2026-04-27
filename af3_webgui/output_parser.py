"""Parse AlphaFold3 output directory and extract results."""

from __future__ import annotations

import json
import os
import pathlib


def parse_job_results(job_id: str) -> dict:
    jobs_root = pathlib.Path(__file__).resolve().parent / "jobs"
    output_dir = jobs_root / job_id / "output"

    if not output_dir.exists():
        return {"samples": [], "top": None, "has_results": False}

    samples = []
    for seed_dir in sorted(output_dir.glob("seed-*_sample-*")):
        parts = seed_dir.name.split("_")
        try:
            seed = int(parts[0].split("-")[1])
            sample_idx = int(parts[1].split("-")[1])
        except (IndexError, ValueError):
            continue

        entry = {
            "seed": seed,
            "sample_idx": sample_idx,
            "dir_name": seed_dir.name,
            "has_cif": False,
            "has_confidences": False,
            "metrics": None,
        }

        for f in seed_dir.iterdir():
            if f.name.endswith("_model.cif"):
                entry["has_cif"] = True
                entry["cif_name"] = f.name
            elif f.name.endswith("_summary_confidences.json"):
                entry["has_confidences"] = True
                entry["summary_name"] = f.name
                try:
                    entry["metrics"] = json.loads(f.read_text())
                except Exception:
                    pass

        samples.append(entry)

    top = None
    for f in output_dir.iterdir():
        if f.name.endswith("_model.cif") and "seed-" not in f.name:
            top = {"has_cif": True, "cif_name": f.name}
        elif f.name.endswith("_summary_confidences.json") and "seed-" not in f.name:
            if top is None:
                top = {}
            top["has_summary"] = True
            top["summary_name"] = f.name
            try:
                top["metrics"] = json.loads(f.read_text())
            except Exception:
                pass

    # Load confidences for top result
    top_conf = None
    for f in output_dir.iterdir():
        if f.name.endswith("_confidences.json") and "seed-" not in f.name:
            top_conf = f.name
    if top and top_conf:
        top["has_confidences"] = True
        top["confidences_name"] = top_conf

    # Find ranking scores
    ranking_csv = list(output_dir.glob("*_ranking_scores.csv"))
    ranking_path = str(ranking_csv[0]) if ranking_csv else None

    return {
        "samples": samples,
        "top": top,
        "has_results": len(samples) > 0,
        "ranking_csv": ranking_path,
    }


def get_result_file_path(job_id: str, seed: int, sample: int, file_type: str) -> str | None:
    """Get path to a specific result file. file_type: 'cif' or 'confidences'."""
    jobs_root = pathlib.Path(__file__).resolve().parent / "jobs"
    output_dir = jobs_root / job_id / "output"

    sample_dir_name = f"seed-{seed}_sample-{sample}"
    sample_dir = output_dir / sample_dir_name

    if not sample_dir.exists():
        return None

    if file_type == "cif":
        cfiles = list(sample_dir.glob("*_model.cif"))
        return str(cfiles[0]) if cfiles else None
    elif file_type == "confidences":
        cfiles = list(sample_dir.glob("*_confidences.json"))
        return str(cfiles[0]) if cfiles else None
    elif file_type == "summary":
        cfiles = list(sample_dir.glob("*_summary_confidences.json"))
        return str(cfiles[0]) if cfiles else None
    return None


def get_top_result_path(job_id: str, file_type: str) -> str | None:
    """Get path to the top-ranked result file."""
    jobs_root = pathlib.Path(__file__).resolve().parent / "jobs"
    output_dir = jobs_root / job_id / "output"

    if not output_dir.exists():
        return None

    if file_type == "cif":
        for f in output_dir.iterdir():
            if f.name.endswith("_model.cif") and "seed-" not in f.name:
                return str(f)
    elif file_type == "confidences":
        for f in output_dir.iterdir():
            if f.name.endswith("_confidences.json") and "seed-" not in f.name:
                return str(f)
    elif file_type == "summary":
        for f in output_dir.iterdir():
            if f.name.endswith("_summary_confidences.json") and "seed-" not in f.name:
                return str(f)
    return None
