import os
import unittest

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


if __name__ == "__main__":
    unittest.main()
