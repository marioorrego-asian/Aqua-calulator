import json
import unittest
from unittest.mock import patch

from app import app
from main import build_stroke_profile


class StrokeProfileTests(unittest.TestCase):
    def test_build_stroke_profile_picks_best_per_category(self):
        data = {
            "props": {
                "swimmer": {"name": "Demo Swimmer", "id": 123},
                "results_short": {
                    "data": [
                        {
                            "result_date": "2026-01-11",
                            "event_name": "100m Freestyle",
                            "aqua_points": 500,
                            "pool_type_name": "25 M",
                            "swim_time": "00:55.11",
                        },
                        {
                            "result_date": "2026-02-01",
                            "event_name": "100m Freestyle",
                            "aqua_points": 650,
                            "pool_type_name": "50 M",
                            "swim_time": "00:54.01",
                        },
                    ]
                },
                "results_long": {
                    "data": [
                        {
                            "result_date": "2026-01-10",
                            "event_name": "100m Backstroke",
                            "aqua_points": 520,
                            "pool_type_name": "25 M",
                            "swim_time": "00:59.77",
                        }
                    ]
                },
            }
        }

        profile = build_stroke_profile(data, "123")

        self.assertEqual(profile["swimmer_name"], "Demo Swimmer")
        self.assertEqual(profile["combined_score"], 1170)
        self.assertEqual(profile["strokes"][0]["event"], "100 Free LCM")
        self.assertEqual(profile["strokes"][0]["aqua_points"], 650)
        self.assertEqual(profile["strokes"][1]["event"], "100 Back SCM")


class FlaskApiTests(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()

    def test_calculate_requires_swimmer_id(self):
        response = self.client.post("/api/calculate", json={})
        self.assertEqual(response.status_code, 400)
        payload = json.loads(response.data)
        self.assertIn("Swimmer ID is required", payload["error"])

    @patch("app.get_stroke_profile_data")
    def test_calculate_returns_profile_json(self, mocked_get_profile):
        mocked_get_profile.return_value = {
            "swimmer_name": "Demo",
            "swimmer_id": 123,
            "target_year": 2026,
            "strokes": [],
            "combined_score": 0,
        }

        response = self.client.post("/api/calculate", json={"swimmer_id": "123"})

        self.assertEqual(response.status_code, 200)
        payload = json.loads(response.data)
        self.assertEqual(payload["swimmer_name"], "Demo")


if __name__ == "__main__":
    unittest.main()
