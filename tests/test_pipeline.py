from pathlib import Path
import unittest

import pandas as pd

from backend.ml.train import train_models
from backend.processing.cleaner import clean_nav
from backend.processing.window_processor import make_windows, process_scenario


class PipelineTests(unittest.TestCase):
    def test_timestamp_cleaning_falls_back_to_real_time_when_timestamp_is_blank(self):
        df = pd.DataFrame(
            {
                "timestamp": [None, None],
                "real_time": ["2026-01-01T00:00:00", "2026-01-01T00:00:01"],
            }
        )

        cleaned = clean_nav(df)

        self.assertEqual(len(cleaned), 2)
        self.assertTrue(cleaned["timestamp"].notna().all())

    def test_make_windows_extracts_features_for_each_full_window(self):
        df = pd.DataFrame(
            {
                "timestamp": pd.to_datetime(
                    [
                        "2026-01-01T00:00:00",
                        "2026-01-01T00:00:10",
                        "2026-01-01T00:00:20",
                    ]
                ),
                "lat": [1.0, 1.0001, 1.0002],
                "lon": [2.0, 2.0001, 2.0002],
                "num_sv": [8, 7, 6],
            }
        )

        windows = make_windows(df)

        self.assertEqual(len(windows), 2)
        self.assertTrue(
            {"pos_jump_mean_m", "sat_count_mean", "window_start", "window_end"}
            <= set(windows.columns)
        )

    def test_process_scenario_without_navigation_data_returns_no_windows(self):
        windows = process_scenario(Path("missing"), {}, {})

        self.assertTrue(windows.empty)

    def test_train_models_requires_multiple_scenarios(self):
        df = pd.DataFrame(
            {
                "feature": [1.0, 2.0],
                "scenario_id": ["one", "one"],
                "label": ["jamming", "jamming"],
            }
        )

        with self.assertRaisesRegex(ValueError, "at least two distinct scenarios"):
            train_models(df, Path("unused"))


if __name__ == "__main__":
    unittest.main()
