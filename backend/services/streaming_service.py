import asyncio
import json
from pathlib import Path

import pandas as pd

from backend.ingestion.file_loader import find_scenario_folders, load_scenario_csvs
from backend.ingestion.format_detector import detect_scenario
from backend.processing.cleaner import clean_nav, clean_rf, clean_rinex
from backend.processing.synchronizer import synchronise


def _scenario_key(root: Path, folder: Path) -> str:
    return folder.relative_to(root).as_posix().replace("/", "__")


def list_scenarios(root: Path) -> list[dict]:
    scenarios = []
    for folder in find_scenario_folders(root):
        if not (folder / "nav_pvt.csv").is_file():
            continue
        metadata = detect_scenario(folder)
        files = {path.name.lower() for path in folder.iterdir() if path.is_file()}
        scenarios.append(
            {
                "scenario_id": _scenario_key(root, folder),
                "recording_id": metadata.get("scenario_id", folder.name),
                "name": folder.name,
                "attack_type": metadata.get("inferred_attack", "unknown"),
                "files": sorted(files),
            }
        )
    return sorted(scenarios, key=lambda scenario: scenario["scenario_id"].lower())


def find_scenario_folder(root: Path, scenario_id: str) -> Path | None:
    for folder in find_scenario_folders(root):
        if (
            (folder / "nav_pvt.csv").is_file()
            and _scenario_key(root, folder) == scenario_id
        ):
            return folder
    return None


def _to_json_value(value):
    if pd.isna(value):
        return None
    if hasattr(value, "isoformat"):
        return value.isoformat()
    if hasattr(value, "item"):
        return value.item()
    return value


async def replay_scenario(folder: Path, interval_ms: int = 500):
    dataframes = load_scenario_csvs(folder)
    nav = clean_nav(dataframes.get("nav_pvt.csv", pd.DataFrame()))
    rf = clean_rf(dataframes.get("mon_rf.csv", pd.DataFrame()))
    rinex = clean_rinex(dataframes.get("rinex.csv", pd.DataFrame()))
    merged = synchronise(nav, rf, rinex)
    if merged.empty or "timestamp" not in merged.columns:
        yield (
            "event: replay_error\n"
            "data: {\"detail\":\"Scenario has no usable navigation data.\"}\n\n"
        )
        return

    metadata = detect_scenario(folder)
    for index, (_, row) in enumerate(merged.iterrows()):
        measurements = {}
        for column in (
            "lat",
            "latitude",
            "lon",
            "longitude",
            "cno",
            "cn0",
            "num_sv",
            "numSV",
            "fix_type",
            "fixType",
            "snr_L1",
            "snr_L2",
            "doppler_L1",
            "doppler_L2",
            "agcCnt_01",
            "agcCnt_02",
            "noisePerMS_01",
            "noisePerMS_02",
            "jamInd_01",
            "jamInd_02",
            "jammingState_01",
            "jammingState_02",
        ):
            if column in row.index:
                measurements[column] = _to_json_value(row[column])

        payload = {
            "scenario_id": metadata.get("scenario_id", folder.name),
            "timestamp": str(row["timestamp"]),
            "sequence": index,
            "measurements": measurements,
        }
        yield f"data: {json.dumps(payload, allow_nan=False)}\n\n"
        await asyncio.sleep(interval_ms / 1000)

    yield "event: complete\ndata: {}\n\n"
