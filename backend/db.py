import json
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterator, Optional

DB_PATH = Path(__file__).resolve().parent / "signalx_history.db"


@contextmanager
def _connect() -> Iterator[sqlite3.Connection]:
    connection = sqlite3.connect(DB_PATH, timeout=10)
    connection.row_factory = sqlite3.Row
    try:
        yield connection
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def init_db() -> None:
    with _connect() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS analyses (
                analysis_id TEXT PRIMARY KEY,
                recording_id TEXT NOT NULL,
                scenario_id TEXT,
                classification TEXT NOT NULL,
                analyzed_at TEXT NOT NULL,
                window_count INTEGER NOT NULL,
                suspicious_count INTEGER NOT NULL,
                result_json TEXT NOT NULL
            )
            """
        )


def save_analysis(
    analysis_id: str,
    recording_id: str,
    scenario_id: Optional[str],
    classification: str,
    window_count: int,
    suspicious_count: int,
    result_dict: dict[str, Any],
) -> str:
    analyzed_at = datetime.now(timezone.utc).isoformat()
    result = dict(result_dict)
    result["analyzed_at"] = analyzed_at

    with _connect() as connection:
        connection.execute(
            """
            INSERT OR REPLACE INTO analyses
                (analysis_id, recording_id, scenario_id, classification, analyzed_at,
                 window_count, suspicious_count, result_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                analysis_id,
                recording_id,
                scenario_id,
                classification,
                analyzed_at,
                window_count,
                suspicious_count,
                json.dumps(result),
            ),
        )
    return analyzed_at


def list_analyses() -> list[dict[str, Any]]:
    with _connect() as connection:
        rows = connection.execute(
            """
            SELECT analysis_id, recording_id, scenario_id, classification,
                   analyzed_at, window_count, suspicious_count
            FROM analyses
            ORDER BY analyzed_at DESC
            LIMIT 200
            """
        ).fetchall()
    return [dict(row) for row in rows]


def get_analysis(analysis_id: str) -> Optional[dict[str, Any]]:
    with _connect() as connection:
        row = connection.execute(
            "SELECT result_json FROM analyses WHERE analysis_id = ?",
            (analysis_id,),
        ).fetchone()
    return json.loads(row["result_json"]) if row else None
