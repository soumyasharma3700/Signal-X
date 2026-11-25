import pandas as pd

from backend import config
from backend.processing.feature_extractor import extract_features


def make_windows(
    df: pd.DataFrame,
    window_size_sec: int = config.WINDOW_SIZE_SEC,
    step_sec: int = config.WINDOW_STEP_SEC,
) -> pd.DataFrame:
    """Split timestamped data into windows and compute features per window."""
    if df.empty or "timestamp" not in df.columns:
        return pd.DataFrame()
    if window_size_sec <= 0 or step_sec <= 0:
        raise ValueError("window_size_sec and step_sec must be positive.")

    df = df.sort_values("timestamp").set_index("timestamp")
    start = df.index.min()
    end = df.index.max()

    rows = []
    cursor = start
    while cursor + pd.Timedelta(seconds=window_size_sec) <= end:
        window_end = cursor + pd.Timedelta(seconds=window_size_sec)
        window_df = df.loc[cursor:window_end]
        if len(window_df) > 0:
            features = extract_features(window_df.reset_index())
            features["window_start"] = cursor
            features["window_end"] = window_end
            rows.append(features)
        cursor += pd.Timedelta(seconds=step_sec)

    return pd.concat(rows, ignore_index=True) if rows else pd.DataFrame()


def process_scenario(
    folder,
    meta: dict,
    dfs: dict[str, pd.DataFrame],
) -> pd.DataFrame:
    """Clean, synchronize, window, and label one scenario."""
    from backend.processing.cleaner import clean_nav, clean_rf, clean_rinex
    from backend.processing.synchronizer import synchronise

    nav = clean_nav(dfs.get("nav_pvt.csv", pd.DataFrame()))
    rf = clean_rf(dfs.get("mon_rf.csv", pd.DataFrame()))
    rinex = clean_rinex(dfs.get("rinex.csv", pd.DataFrame()))

    merged = synchronise(nav, rf, rinex)
    windows = make_windows(merged)
    if not windows.empty:
        windows["scenario_id"] = folder.name
        windows["recording_id"] = meta.get("scenario_id", folder.name)
        windows["label"] = meta.get("inferred_attack", "unknown")
    return windows
