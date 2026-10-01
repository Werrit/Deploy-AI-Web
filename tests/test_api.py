import os
from io import BytesIO
import unittest

from PIL import Image

os.environ["ENABLED_MODELS"] = ""

from fastapi.testclient import TestClient

from api import main


class FakeBot:
    def stream(self, message, history=None):
        assert message == "Đổi trả?"
        assert history == []
        return [{"source": "doi_tra.md", "text": "7 ngày", "score": 0.9}], iter(["Được ", "7 ngày."])

    def answer(self, message, history=None):
        assert message == "Đổi trả?"
        return {"answer": "Được 7 ngày.", "sources": []}


class FakeClassifier:
    def predict(self, image):
        assert image.size == (2, 2)
        return {"predictions": [{"label": "daisy", "score": 0.9}], "confident": True}


class ChatApiTest(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(main.app)
        self.client.__enter__()
        main.MODELS["llm"] = FakeBot()

    def tearDown(self):
        main.MODELS.clear()
        self.client.__exit__(None, None, None)

    def test_stream_returns_sources_tokens_and_done(self):
        response = self.client.post("/api/chat", json={"message": "Đổi trả?"})
        self.assertEqual(response.status_code, 200)
        self.assertIn('"type": "sources"', response.text)
        self.assertIn('"type": "token"', response.text)
        self.assertIn('"type": "done"', response.text)
        self.assertIn("7 ngày", response.text)

    def test_sync_returns_answer(self):
        response = self.client.post("/api/chat/sync", json={"message": "Đổi trả?"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["answer"], "Được 7 ngày.")

    def test_empty_message_returns_422(self):
        response = self.client.post("/api/chat", json={"message": ""})
        self.assertEqual(response.status_code, 422)

    def test_unloaded_model_returns_503(self):
        main.MODELS.clear()
        response = self.client.post("/api/chat/sync", json={"message": "Đổi trả?"})
        self.assertEqual(response.status_code, 503)

    def test_classifier_predicts_uploaded_image(self):
        image_bytes = BytesIO()
        Image.new("RGB", (2, 2)).save(image_bytes, format="PNG")
        main.MODELS["classifier"] = FakeClassifier()
        response = self.client.post(
            "/api/classifier/predict",
            files={"file": ("flower.png", image_bytes.getvalue(), "image/png")},
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["predictions"][0]["label"], "daisy")

    def test_classifier_rejects_invalid_image(self):
        main.MODELS["classifier"] = FakeClassifier()
        response = self.client.post(
            "/api/classifier/predict",
            files={"file": ("not-image.png", b"invalid", "image/png")},
        )
        self.assertEqual(response.status_code, 400)

    def test_unloaded_classifier_returns_503(self):
        response = self.client.post(
            "/api/classifier/predict",
            files={"file": ("flower.png", b"invalid", "image/png")},
        )
        self.assertEqual(response.status_code, 503)

    def test_classifier_rejects_oversized_upload(self):
        main.MODELS["classifier"] = FakeClassifier()
        response = self.client.post(
            "/api/classifier/predict",
            files={"file": ("flower.png", b"x" * (10 * 1024 * 1024 + 1), "image/png")},
        )
        self.assertEqual(response.status_code, 413)


if __name__ == "__main__":
    unittest.main()
