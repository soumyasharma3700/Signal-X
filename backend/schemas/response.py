from typing import Dict, List, Optional

from pydantic import BaseModel, Field


class WindowPrediction(BaseModel):
    start_time: str
    end_time: str
    predicted_class: str
    probability_scores: Dict[str, float] = Field(default_factory=dict)
    measurements: Dict[str, Optional[float]] = Field(default_factory=dict)


class TrajectoryPoint(BaseModel):
    lat: float
    lon: float
    t: str


class AnalysisResponse(BaseModel):
    analysis_id: str = ""
    recording_id: str
    scenario_id: Optional[str] = None
    classification: str
    analyzed_at: Optional[str] = None
    window_predictions: List[WindowPrediction]
    indicators: Dict[str, str] = Field(default_factory=dict)
    trajectory: List[TrajectoryPoint] = Field(default_factory=list)
    disclaimer: str = (
        "Model probabilities are statistical estimates from the trained "
        "classifier, not verified probabilities of an actual GNSS attack."
    )


class ModelInfoResponse(BaseModel):
    model_type: Optional[str] = None
    macro_f1: Optional[float] = None
    supported_classes: List[str] = Field(default_factory=list)
    expected_features: List[str] = Field(default_factory=list)
