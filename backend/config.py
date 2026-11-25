from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

RAW_DATA_DIR = BASE_DIR / "datasets" / "raw"
PROCESSED_DATA_DIR = BASE_DIR / "datasets" / "processed"
METADATA_DIR = BASE_DIR / "datasets" / "metadata"
MODEL_DIR = BASE_DIR / "backend" / "ml"

WINDOW_SIZE_SEC = 10
WINDOW_STEP_SEC = 10
TIMESTAMP_TOLERANCE = "1s"

TIME_CANDIDATES = [
    "time",
    "timestamp",
    "utc_time",
    "gps_time",
    "real_time",
    "Tow",
    "iTOW",
]

ATTACK_CLASS_MAP = {
    "Jamming": "jamming",
    "Spoofing": "spoofing",
    "Meaconing": "meaconing",
    "Jamming+Spoofing": "combined",
}
