import pandas as pd

from backend import config


def standardise_timestamp(df: pd.DataFrame) -> pd.DataFrame:
    """Add a uniform timestamp column using the first matching source column."""
    df = df.copy()
    for column in config.TIME_CANDIDATES:
        if column in df.columns:
            parsed = pd.to_datetime(df[column], errors="coerce")
            if parsed.notna().any():
                df["timestamp"] = parsed
                df = df.dropna(subset=["timestamp"])
                break
    return df


def drop_duplicates(df: pd.DataFrame, subset=None) -> pd.DataFrame:
    if subset is None:
        subset = ["timestamp"] if "timestamp" in df.columns else None
    return df.drop_duplicates(subset=subset)


def clean_nav(df: pd.DataFrame) -> pd.DataFrame:
    """Standardize navigation timestamps and remove duplicate rows."""
    if df.empty:
        return df
    df = standardise_timestamp(df)
    return drop_duplicates(
        df, subset=["timestamp"] if "timestamp" in df.columns else None
    )


def clean_rf(df: pd.DataFrame) -> pd.DataFrame:
    if df.empty:
        return df
    df = standardise_timestamp(df)
    return drop_duplicates(
        df, subset=["timestamp"] if "timestamp" in df.columns else None
    )


def clean_rinex(df: pd.DataFrame) -> pd.DataFrame:
    if df.empty:
        return df
    df = standardise_timestamp(df)
    return drop_duplicates(
        df, subset=["timestamp"] if "timestamp" in df.columns else None
    )
