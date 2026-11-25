import json
from pathlib import Path

import joblib
import pandas as pd
from sklearn.ensemble import ExtraTreesClassifier, RandomForestClassifier
from sklearn.metrics import classification_report, f1_score
from sklearn.model_selection import GroupKFold

from backend import config


def load_all_windows(root: Path) -> pd.DataFrame:
    """Process all recordings under root and concatenate their feature windows."""
    from backend.ingestion.file_loader import iter_recordings
    from backend.processing.window_processor import process_scenario

    all_windows = []
    for folder, meta, dataframes in iter_recordings(root):
        try:
            windows = process_scenario(folder, meta, dataframes)
            if not windows.empty:
                all_windows.append(windows)
        except Exception as exc:
            print(f"[WARN] Skipping {folder.name}: {exc}")

    if not all_windows:
        raise RuntimeError("No windows were produced. Check dataset paths and schemas.")
    return pd.concat(all_windows, ignore_index=True)


def train_models(df: pd.DataFrame, output_dir: Path):
    """Select a classifier using scenario-grouped cross-validation and save it."""
    non_feature = {"window_start", "window_end", "scenario_id", "recording_id", "label"}
    feature_cols = [column for column in df.columns if column not in non_feature]
    feature_cols = [
        column for column in feature_cols
        if pd.api.types.is_numeric_dtype(df[column])
    ]

    X = df[feature_cols].fillna(0)
    y = df["label"]
    groups = df["scenario_id"]
    n_splits = min(5, groups.nunique())
    if n_splits < 2:
        raise ValueError("Training requires at least two distinct scenarios.")
    if not feature_cols:
        raise ValueError("Training data contains no numeric feature columns.")

    group_kfold = GroupKFold(n_splits=n_splits)
    models = {
        "rf": RandomForestClassifier(n_estimators=200, random_state=42, n_jobs=-1),
        "et": ExtraTreesClassifier(n_estimators=200, random_state=42, n_jobs=-1),
    }

    best_model = None
    best_score = -1
    best_name = ""
    best_report = {}

    for name, model in models.items():
        fold_scores = []
        reports = []
        for train_idx, val_idx in group_kfold.split(X, y, groups=groups):
            X_train, X_val = X.iloc[train_idx], X.iloc[val_idx]
            y_train, y_val = y.iloc[train_idx], y.iloc[val_idx]
            model.fit(X_train, y_train)
            predictions = model.predict(X_val)
            fold_scores.append(
                f1_score(y_val, predictions, average="macro", zero_division=0)
            )
            reports.append(
                classification_report(y_val, predictions, zero_division=0)
            )

        mean_f1 = sum(fold_scores) / len(fold_scores)
        print(f"{name}: macro-F1 = {mean_f1:.4f}")
        if mean_f1 > best_score:
            best_score = mean_f1
            best_model = model
            best_name = name
            best_report = {
                "model": name,
                "macro_f1": mean_f1,
                "fold_scores": fold_scores,
                "classification_report": reports,
            }

    best_model.fit(X, y)
    output_dir.mkdir(parents=True, exist_ok=True)
    joblib.dump(best_model, output_dir / "model.joblib")
    with open(output_dir / "feature_columns.json", "w", encoding="utf-8") as file:
        json.dump(feature_cols, file, indent=2)
    with open(output_dir / "training_report.json", "w", encoding="utf-8") as file:
        json.dump(best_report, file, indent=2)

    print(f"Saved best model ({best_name}) to {output_dir}")
    return best_model, feature_cols


def main():
    df = load_all_windows(config.RAW_DATA_DIR)
    train_models(df, config.MODEL_DIR)


if __name__ == "__main__":
    main()
