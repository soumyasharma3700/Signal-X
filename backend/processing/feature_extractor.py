import numpy as np
import pandas as pd


def safe_numeric(series: pd.Series) -> pd.Series:
    return pd.to_numeric(series, errors="coerce")


def extract_features(df: pd.DataFrame) -> pd.DataFrame:
    """Compute available receiver-level features for one synchronized window."""
    features = {}
    n = len(df)

    cno_candidates = ["cno", "cn0", "CNo", "CN0", "cno_mean", "signal_strength"]
    cno_col = next((column for column in cno_candidates if column in df.columns), None)
    if cno_col:
        cno = safe_numeric(df[cno_col]).dropna()
        if len(cno) > 0:
            features["cno_mean"] = cno.mean()
            features["cno_min"] = cno.min()
            features["cno_max"] = cno.max()
            features["cno_std"] = cno.std()
        else:
            features["cno_mean"] = np.nan

    sat_candidates = ["num_sv", "numSV", "satellites", "n_sat", "num_sats"]
    sat_col = next((column for column in sat_candidates if column in df.columns), None)
    if sat_col:
        sats = safe_numeric(df[sat_col]).dropna()
        if len(sats) > 0:
            features["sat_count_mean"] = sats.mean()
            features["sat_count_min"] = sats.min()
            features["sat_count_std"] = sats.std()
            features["sat_count_rate"] = sats.diff().abs().mean()

    fix_candidates = ["fix_type", "fixType", "fix", "gps_fix"]
    fix_col = next((column for column in fix_candidates if column in df.columns), None)
    if fix_col:
        fix = safe_numeric(df[fix_col])
        features["fix_available_ratio"] = (fix > 0).mean()

    lat_col = next((column for column in ["lat", "latitude"] if column in df.columns), None)
    lon_col = next((column for column in ["lon", "longitude"] if column in df.columns), None)
    if lat_col and lon_col:
        lat = safe_numeric(df[lat_col]).dropna()
        lon = safe_numeric(df[lon_col]).dropna()
        if len(lat) > 1 and len(lon) > 1:
            dlat = np.diff(lat) * 111_000
            dlon = np.diff(lon) * 111_000 * np.cos(np.radians(lat.iloc[:-1]))
            dist = np.sqrt(dlat**2 + dlon**2)
            features["pos_jump_mean_m"] = np.nanmean(dist)
            features["pos_jump_max_m"] = np.nanmax(dist)

    vel_cols = [column for column in ["vel_n", "vel_e", "vel_d", "vn", "ve", "vd"] if column in df.columns]
    if vel_cols:
        velocity = df[vel_cols].apply(safe_numeric)
        speed = np.sqrt((velocity**2).sum(axis=1))
        features["speed_mean"] = speed.mean()
        features["speed_std"] = speed.std()

    for rf_col in ["agc", "noise", "jam_ind", "jamming", "interference"]:
        if rf_col in df.columns:
            values = safe_numeric(df[rf_col]).dropna()
            if len(values) > 0:
                features[f"rf_{rf_col}_mean"] = values.mean()
                features[f"rf_{rf_col}_std"] = values.std()

    doppler_cols = [column for column in df.columns if "doppler" in column.lower()]
    if doppler_cols:
        doppler = df[doppler_cols].apply(safe_numeric)
        features["doppler_std_mean"] = doppler.std().mean()

    features["n_observations"] = n
    features["n_missing"] = df.isna().sum().sum()
    return pd.DataFrame([features])
