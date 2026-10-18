"""Contract checks for the FreeLLMAPI chat adapter."""
import io
import json
import os
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parent))
import app as server


class AssistantTests(unittest.TestCase):
    def setUp(self):
        server.attempts.clear()
        self.client = server.app.test_client()

    def test_missing_settings_disable_assistant(self):
        with patch.dict(os.environ, {
            "LORD_FREELLMAPI_BASE_URL": "",
            "LORD_FREELLMAPI_API_KEY": "",
        }):
            self.assertFalse(self.client.get("/api/assistant/status").json["configured"])
            response = self.client.post("/api/assistant", json={"message": "What is MFA?", "language": "en"})
        self.assertEqual(response.status_code, 503)

    def test_hosted_server_rejects_localhost_gateway(self):
        with patch.dict(os.environ, {
            "LORD_HOSTED": "1",
            "LORD_FREELLMAPI_BASE_URL": "http://127.0.0.1:31415/v1",
            "LORD_FREELLMAPI_API_KEY": "test-key",
        }):
            self.assertFalse(self.client.get("/api/assistant/status").json["configured"])

    def test_malformed_gateway_address_does_not_crash_status(self):
        with patch.dict(os.environ, {
            "LORD_FREELLMAPI_BASE_URL": "http://[broken/v1",
            "LORD_FREELLMAPI_API_KEY": "test-key",
        }):
            response = self.client.get("/api/assistant/status")
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.json["configured"])

    def test_chat_uses_router_contract(self):
        def fake_urlopen(request, timeout):
            self.assertEqual(request.full_url, "http://127.0.0.1:31415/v1/chat/completions")
            self.assertEqual(request.get_header("Authorization"), "Bearer test-key")
            self.assertEqual(timeout, 20)
            body = json.loads(request.data)
            self.assertEqual(body["model"], "auto")
            self.assertEqual(body["messages"][1]["content"], "What is MFA?")
            return io.BytesIO(b'{"choices":[{"message":{"content":"Multi-factor authentication."}}]}')

        with patch.dict(os.environ, {
            "LORD_HOSTED": "0",
            "LORD_FREELLMAPI_BASE_URL": "http://127.0.0.1:31415/v1",
            "LORD_FREELLMAPI_API_KEY": "test-key",
            "LORD_FREELLMAPI_MODEL": "auto",
        }), patch.object(server.urlrequest, "urlopen", side_effect=fake_urlopen):
            response = self.client.post("/api/assistant", json={"message": "What is MFA?", "language": "en"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json["answer"], "Multi-factor authentication.")


if __name__ == "__main__":
    unittest.main()

