import json
from pathlib import Path

import joblib
import pandas as pd

from backend import config


class Predictor:
    def __init__(self, model_dir: Path = config.MODEL_DIR):
        self.model = joblib.load(model_dir / "model.joblib")
        with open(model_dir / "feature_columns.json", "r", encoding="utf-8") as file:
            self.feature_columns = json.load(file)

    def predict(self, features_df: pd.DataFrame) -> pd.DataFrame:
        """Predict classes and, when supported, per-class scores."""
        X = features_df.reindex(columns=self.feature_columns).fillna(0)
        predictions = self.model.predict(X)
        probabilities = (
            self.model.predict_proba(X)
            if hasattr(self.model, "predict_proba")
            else None
        )
        result = features_df.copy()
        result["predicted_class"] = predictions
        if probabilities is not None:
            for index, label in enumerate(self.model.classes_):
                result[f"prob_{label}"] = probabilities[:, index]
        return result
