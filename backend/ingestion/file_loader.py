from pathlib import Path
import pandas as pd

from backend.ingestion.format_detector import detect_scenario


def find_scenario_folders(root: Path) -> list[Path]:
    """Find folders containing at least one recognized scenario CSV."""
    key_files = {"nav_pvt.csv", "mon_rf.csv", "rinex.csv"}
    folders = []
    for folder in root.rglob("*"):
        if folder.is_dir():
            files = {file.name.lower() for file in folder.iterdir() if file.is_file()}
            if files & key_files:
                folders.append(folder)
    return folders


def load_scenario_csvs(folder: Path) -> dict[str, pd.DataFrame]:
    """Load available scenario CSVs, omitting files that are not present."""
    dataframes = {}
    for csv_name in ["nav_pvt.csv", "mon_rf.csv", "rinex.csv"]:
        csv_path = folder / csv_name
        if csv_path.exists():
            try:
                df = pd.read_csv(csv_path)
                df["__scenario_folder__"] = str(folder.name)
                dataframes[csv_name] = df
            except Exception as exc:
                print(f"[WARN] Could not read {csv_path}: {exc}")
    return dataframes


def iter_recordings(root: Path):
    """Yield each recording folder, its metadata, and its available dataframes."""
    for folder in find_scenario_folders(root):
        meta = detect_scenario(folder)
        dataframes = load_scenario_csvs(folder)
        yield folder, meta, dataframes
