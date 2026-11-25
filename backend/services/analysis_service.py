import math
import uuid

import pandas as pd

from backend import db
from backend.ml.predict import Predictor
from backend.processing.cleaner import clean_nav, clean_rf, clean_rinex
from backend.processing.synchronizer import synchronise
from backend.processing.window_processor import make_windows
from backend.schemas.response import (
    AnalysisResponse,
    TrajectoryPoint,
    WindowPrediction,
)

_predictor = None

MEASUREMENT_COLUMNS = [
    "cno_mean",
    "cno_min",
    "cno_max",
    "cno_std",
    "sat_count_mean",
    "sat_count_min",
    "sat_count_std",
    "sat_count_rate",
    "fix_available_ratio",
    "pos_jump_mean_m",
    "pos_jump_max_m",
    "speed_mean",
    "speed_std",
    "doppler_std_mean",
    "n_observations",
    "n_missing",
]


def get_predictor() -> Predictor:
    global _predictor
    if _predictor is None:
        _predictor = Predictor()
    return _predictor


def _safe_float(value):
    try:
        number = float(value)
        return None if not math.isfinite(number) else round(number, 4)
    except (TypeError, ValueError):
        return None


def _extract_trajectory(
    merged: pd.DataFrame, max_points: int = 300
) -> list[TrajectoryPoint]:
    """Sample finite navigation coordinates for the map view."""
    if merged is None or merged.empty or "timestamp" not in merged.columns:
        return []

    lat_col = next(
        (column for column in ["lat", "latitude"] if column in merged.columns), None
    )
    lon_col = next(
        (column for column in ["lon", "longitude"] if column in merged.columns), None
    )
    if lat_col is None or lon_col is None:
        return []

    df = merged[[lat_col, lon_col, "timestamp"]].copy()
    df[lat_col] = pd.to_numeric(df[lat_col], errors="coerce")
    df[lon_col] = pd.to_numeric(df[lon_col], errors="coerce")
    df = df.dropna(subset=[lat_col, lon_col, "timestamp"])
    df = df[df[lat_col].map(math.isfinite) & df[lon_col].map(math.isfinite)]
    if df.empty:
        return []

    if len(df) > max_points:
        step = math.ceil(len(df) / max_points)
        df = df.iloc[::step].head(max_points)

    return [
        TrajectoryPoint(
            lat=float(row[lat_col]),
            lon=float(row[lon_col]),
            t=str(row["timestamp"]),
        )
        for _, row in df.iterrows()
    ]


def analyse_scenario(
    nav: pd.DataFrame,
    rf: pd.DataFrame,
    rinex: pd.DataFrame,
    recording_id: str,
    scenario_id: str | None = None,
) -> AnalysisResponse:
    nav_clean = clean_nav(nav)
    rf_clean = clean_rf(rf)
    rinex_clean = clean_rinex(rinex)
    merged = synchronise(nav_clean, rf_clean, rinex_clean)
    windows = make_windows(merged)

    if windows.empty:
        raise ValueError(
            "No valid time windows could be produced from the uploaded recording."
        )

    predicted = get_predictor().predict(windows)
    window_predictions = []
    suspicious_count = 0

    for _, row in predicted.iterrows():
        probabilities = {
            column.replace("prob_", ""): float(row[column])
            for column in predicted.columns
            if column.startswith("prob_")
        }
        measurements = {
            column: _safe_float(row.get(column))
            for column in MEASUREMENT_COLUMNS
            if column in predicted.columns
        }
        predicted_class = str(row["predicted_class"])
        if predicted_class not in ("normal", "unknown"):
            suspicious_count += 1
        window_predictions.append(
            WindowPrediction(
                start_time=str(row["window_start"]),
                end_time=str(row["window_end"]),
                predicted_class=predicted_class,
                probability_scores=probabilities,
                measurements=measurements,
            )
        )

    majority = predicted["predicted_class"].mode().iloc[0]
    classification = f"possible_{majority}"

    indicators = {}
    if "cno_mean" in predicted.columns:
        indicators["signal_quality"] = (
            "degraded" if predicted["cno_mean"].mean() < 30 else "nominal"
        )
    if "sat_count_mean" in predicted.columns:
        indicators["satellite_visibility"] = (
            "reduced" if predicted["sat_count_mean"].mean() < 6 else "nominal"
        )
    if "fix_available_ratio" in predicted.columns:
        indicators["fix_availability"] = (
            "poor" if predicted["fix_available_ratio"].mean() < 0.8 else "nominal"
        )
    if "pos_jump_max_m" in predicted.columns:
        indicators["position_stability"] = (
            "anomalous" if predicted["pos_jump_max_m"].max() > 50 else "nominal"
        )

    analysis_id = uuid.uuid4().hex[:12]
    response = AnalysisResponse(
        analysis_id=analysis_id,
        recording_id=recording_id,
        scenario_id=scenario_id,
        classification=classification,
        window_predictions=window_predictions,
        indicators=indicators,
        trajectory=_extract_trajectory(merged),
    )

    response.analyzed_at = db.save_analysis(
        analysis_id=analysis_id,
        recording_id=recording_id,
        scenario_id=scenario_id,
        classification=classification,
        window_count=len(window_predictions),
        suspicious_count=suspicious_count,
        result_dict=response.model_dump(mode="json"),
    )
    return response
