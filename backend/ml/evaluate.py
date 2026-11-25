import json
from pathlib import Path

import joblib
import pandas as pd
from sklearn.metrics import classification_report, confusion_matrix


def evaluate_on_scenario(model_dir: Path, windows_df: pd.DataFrame):
    """Evaluate a saved model on labeled windows, typically held-out scenarios."""
    model = joblib.load(model_dir / "model.joblib")
    with open(model_dir / "feature_columns.json", "r", encoding="utf-8") as file:
        feature_cols = json.load(file)

    X = windows_df[feature_cols].fillna(0)
    y = windows_df["label"]
    predictions = model.predict(X)

    print(classification_report(y, predictions, zero_division=0))
    print("Confusion matrix:\n", confusion_matrix(y, predictions))
    return {
        "report": classification_report(
            y, predictions, output_dict=True, zero_division=0
        )
    }
