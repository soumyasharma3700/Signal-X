import asyncio
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import pandas as pd

from backend import db
from backend.services import analysis_service
from backend.services.streaming_service import (
    find_scenario_folder,
    list_scenarios,
    replay_scenario,
)


class PersistenceAndStreamingTests(unittest.TestCase):
    def test_analysis_is_saved_and_read_back_with_timestamp(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            database_path = Path(temp_dir) / "history.sqlite"
            result = {
                "analysis_id": "analysis-1",
                "recording_id": "recording.csv",
                "analyzed_at": None,
            }
            with patch.object(db, "DB_PATH", database_path):
                db.init_db()
                analyzed_at = db.save_analysis(
                    analysis_id="analysis-1",
                    recording_id="recording.csv",
                    scenario_id="scenario-1",
                    classification="possible_jamming",
                    window_count=3,
                    suspicious_count=2,
                    result_dict=result,
                )

                saved_result = db.get_analysis("analysis-1")
                history = db.list_analyses()
                missing_result = db.get_analysis("missing")

            self.assertEqual(saved_result["analyzed_at"], analyzed_at)
            self.assertEqual(history[0]["suspicious_count"], 2)
            self.assertIsNone(missing_result)

    def test_scenario_listing_and_replay_emit_navigation_rows(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            scenario_folder = root / "Jamming" / "recording-1"
            scenario_folder.mkdir(parents=True)
            pd.DataFrame(
                {
                    "time": ["2026-01-01T00:00:00", "2026-01-01T00:00:01"],
                    "lat": [59.1, 59.2],
                    "lon": [18.1, 18.2],
                    "cno": [28.0, 27.0],
                }
            ).to_csv(scenario_folder / "nav_pvt.csv", index=False)

            scenarios = list_scenarios(root)
            scenario_id = scenarios[0]["scenario_id"]
            self.assertEqual(scenarios[0]["attack_type"], "jamming")
            self.assertEqual(
                find_scenario_folder(root, scenario_id), scenario_folder
            )

            async def collect_events():
                return [
                    event
                    async for event in replay_scenario(scenario_folder, interval_ms=0)
                ]

            events = asyncio.run(collect_events())
            payload = json.loads(events[0].removeprefix("data: ").strip())
            self.assertEqual(payload["measurements"]["cno"], 28.0)
            self.assertIn("event: complete", events[-1])

    def test_analysis_response_contains_measurements_trajectory_and_persisted_id(self):
        class FakePredictor:
            def predict(self, windows):
                result = windows.copy()
                result["predicted_class"] = "jamming"
                result["prob_jamming"] = 0.9
                return result

        nav = pd.DataFrame(
            {
                "timestamp": pd.to_datetime(
                    [
                        "2026-01-01T00:00:00",
                        "2026-01-01T00:00:10",
                        "2026-01-01T00:00:20",
                    ]
                ),
                "lat": [59.1, 59.2, 59.3],
                "lon": [18.1, 18.2, 18.3],
                "cno": [28.0, 27.0, 26.0],
                "num_sv": [7, 6, 5],
            }
        )

        with tempfile.TemporaryDirectory() as temp_dir:
            database_path = Path(temp_dir) / "history.sqlite"
            with patch.object(db, "DB_PATH", database_path):
                db.init_db()
                with patch.object(
                    analysis_service, "get_predictor", return_value=FakePredictor()
                ):
                    result = analysis_service.analyse_scenario(
                        nav, pd.DataFrame(), pd.DataFrame(), "recording.csv"
                    )

                saved_result = db.get_analysis(result.analysis_id)
                history = db.list_analyses()

        self.assertEqual(len(result.window_predictions), 2)
        self.assertEqual(len(result.trajectory), 3)
        self.assertEqual(result.window_predictions[0].measurements["cno_mean"], 27.5)
        self.assertEqual(saved_result["analyzed_at"], result.analyzed_at)
        self.assertEqual(history[0]["suspicious_count"], 2)


if __name__ == "__main__":
    unittest.main()
