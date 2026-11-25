import pandas as pd

from backend import config


def synchronise(
    nav: pd.DataFrame, rf: pd.DataFrame, rinex: pd.DataFrame
) -> pd.DataFrame:
    """Merge streams against navigation data using nearest timestamps."""
    base = nav.copy()
    if base.empty:
        return base
    base = base.sort_values("timestamp").reset_index(drop=True)

    if rf is not None and not rf.empty and "timestamp" in rf.columns:
        rf_sorted = rf.sort_values("timestamp")
        base = pd.merge_asof(
            base,
            rf_sorted,
            on="timestamp",
            tolerance=pd.Timedelta(config.TIMESTAMP_TOLERANCE),
            direction="nearest",
            suffixes=("", "_rf"),
        )

    if rinex is not None and not rinex.empty and "timestamp" in rinex.columns:
        rinex_sorted = rinex.sort_values("timestamp")
        base = pd.merge_asof(
            base,
            rinex_sorted,
            on="timestamp",
            tolerance=pd.Timedelta(config.TIMESTAMP_TOLERANCE),
            direction="nearest",
            suffixes=("", "_rinex"),
        )

    return base
