import io
import json
import logging
from pathlib import Path

import joblib
import pandas as pd
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles

from backend import config, db
from backend.ingestion.validator import validate_dataframes
from backend.schemas.response import AnalysisResponse, ModelInfoResponse
from backend.services.analysis_service import analyse_scenario
from backend.services.streaming_service import (
    find_scenario_folder,
    list_scenarios,
    replay_scenario,
)

logger = logging.getLogger(__name__)
app = FastAPI(title="SIGNAL X - GNSS Interference Detection", version="1.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

db.init_db()
DATA_ROOT = Path(config.RAW_DATA_DIR) / "jammertest_2024"
DIST_DIR = Path(__file__).resolve().parent.parent / "frontend" / "dist"


async def _read_csv(file: UploadFile) -> pd.DataFrame:
    try:
        contents = await file.read()
        return pd.read_csv(io.StringIO(contents.decode("utf-8-sig")))
    except (UnicodeDecodeError, pd.errors.ParserError, ValueError) as exc:
        raise HTTPException(status_code=400, detail=f"Could not parse CSV: {exc}")


@app.get("/health")
async def health():
    return {"status": "ok", "service": "signal-x"}


@app.get("/api/model/info", response_model=ModelInfoResponse)
async def model_info():
    try:
        with open(config.MODEL_DIR / "training_report.json", encoding="utf-8") as file:
            report = json.load(file)
        with open(config.MODEL_DIR / "feature_columns.json", encoding="utf-8") as file:
            features = json.load(file)
        model = joblib.load(config.MODEL_DIR / "model.joblib")
        return {
            "model_type": report.get("model"),
            "macro_f1": report.get("macro_f1"),
            "supported_classes": list(model.classes_),
            "expected_features": features,
        }
    except FileNotFoundError:
        raise HTTPException(
            status_code=503, detail="Model artifacts not found. Run training first."
        )


@app.post("/api/datasets/inspect")
async def inspect_dataset(file: UploadFile = File(...)):
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported.")
    df = await _read_csv(file)
    return {
        "filename": file.filename,
        "rows": len(df),
        "columns": list(df.columns),
        "dtypes": {column: str(dtype) for column, dtype in df.dtypes.items()},
        "missing_counts": df.isna().sum().to_dict(),
    }


@app.post("/api/datasets/validate")
async def validate_dataset(file: UploadFile = File(...)):
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported.")
    df = await _read_csv(file)
    return validate_dataframes({file.filename: df})


@app.post("/api/analyze", response_model=AnalysisResponse)
async def analyse(
    nav_file: UploadFile = File(...),
    rf_file: UploadFile | None = File(None),
    rinex_file: UploadFile | None = File(None),
    scenario_id: str | None = Form(None),
):
    if not nav_file.filename or not nav_file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Navigation input must be a CSV.")
    nav = await _read_csv(nav_file)
    rf = await _read_csv(rf_file) if rf_file else pd.DataFrame()
    rinex = await _read_csv(rinex_file) if rinex_file else pd.DataFrame()

    try:
        return analyse_scenario(
            nav,
            rf,
            rinex,
            recording_id=nav_file.filename or "uploaded",
            scenario_id=scenario_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=f"Model artifacts missing: {exc}")
    except Exception as exc:
        logger.exception("Analysis failed for %s", nav_file.filename)
        raise HTTPException(status_code=500, detail=f"Analysis failed: {exc}")


@app.get("/api/results/{analysis_id}", response_model=AnalysisResponse)
async def get_result(analysis_id: str):
    result = db.get_analysis(analysis_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Analysis not found.")
    return result


@app.get("/api/history")
async def get_history():
    return {"analyses": db.list_analyses()}


@app.get("/api/scenarios")
async def get_scenarios():
    if not DATA_ROOT.exists():
        raise HTTPException(
            status_code=503,
            detail=f"Dataset not found at {DATA_ROOT}. Extract the archive first.",
        )
    scenarios = list_scenarios(DATA_ROOT)
    return {"root": DATA_ROOT.name, "count": len(scenarios), "scenarios": scenarios}


@app.get("/api/stream/{scenario_id}")
async def stream_scenario(scenario_id: str, interval_ms: int = 500):
    folder = find_scenario_folder(DATA_ROOT, scenario_id)
    if folder is None:
        raise HTTPException(
            status_code=404, detail=f"Scenario '{scenario_id}' not found."
        )
    interval_ms = max(50, min(interval_ms, 5000))
    return StreamingResponse(
        replay_scenario(folder, interval_ms=interval_ms),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


if DIST_DIR.is_dir():
    ASSET_DIR = DIST_DIR / "assets"
    if ASSET_DIR.is_dir():
        app.mount("/assets", StaticFiles(directory=ASSET_DIR), name="frontend-assets")

    @app.get("/", include_in_schema=False)
    async def frontend_root():
        return FileResponse(DIST_DIR / "index.html")

    @app.get("/{frontend_path:path}", include_in_schema=False)
    async def frontend_route(frontend_path: str):
        if frontend_path == "health" or frontend_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="Not found.")

        candidate = (DIST_DIR / frontend_path).resolve()
        try:
            candidate.relative_to(DIST_DIR.resolve())
        except ValueError:
            raise HTTPException(status_code=404, detail="Not found.")

        if candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(DIST_DIR / "index.html")
