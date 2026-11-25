from pathlib import Path
import json


def detect_scenario(path: Path) -> dict:
    """Read scenario metadata and infer the attack type from its path."""
    meta = {}
    scenario_json = path / "scenario.json"
    if scenario_json.exists():
        with open(scenario_json, "r", encoding="utf-8") as file:
            meta = json.load(file)

    parts = [part.lower() for part in path.parts]
    attack = "unknown"
    for key in ["jamming", "spoofing", "meaconing", "jamming+spoofing"]:
        if key in parts:
            attack = key
            break
    meta["inferred_attack"] = attack
    return meta
