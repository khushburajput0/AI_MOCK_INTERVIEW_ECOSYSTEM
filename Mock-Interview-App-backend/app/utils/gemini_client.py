import json
import httpx
from typing import Optional

from app.core.config import settings


class GeminiAPIError(RuntimeError):
    def __init__(self, status_code: int, detail: str, retry_after: Optional[float] = None):
        self.status_code = status_code
        self.detail = detail
        self.retry_after = retry_after
        super().__init__(detail)


class GeminiClient:
    """Minimal Gemini-like client wrapper.

    Expects environment variables:
      GEMINI_API_KEY - the API key/token
      GOOGLE_API_KEY - alternate Gemini API key env var
      GEMINI_MODEL - optional model name, defaults to gemini-flash-latest
      GEMINI_MAX_OUTPUT_TOKENS - optional max output tokens, defaults to 4096
      GEMINI_API_URL - optional override of the API URL
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        api_url: Optional[str] = None,
        model: Optional[str] = None,
        timeout: int = 15,
    ):
        # prefer explicit args, then settings from .env via pydantic Settings
        self.api_key = api_key or getattr(settings, "GOOGLE_API_KEY", None) or getattr(settings, "GEMINI_API_KEY", None)
        self.api_url = api_url or getattr(settings, "GEMINI_API_URL", None)
        self.model = model or getattr(settings, "GEMINI_MODEL", None) or "gemini-flash-latest"
        self.max_output_tokens = getattr(settings, "GEMINI_MAX_OUTPUT_TOKENS", 4096) or 4096
        # Gemini generateContent endpoint. Can be overridden with GEMINI_API_URL.
        if not self.api_url:
            self.api_url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent"
        self.timeout = timeout

    def generate(self, prompt: str) -> list | str:
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["x-goog-api-key"] = self.api_key

        body = {
            "contents": [
                {
                    "parts": [
                        {
                            "text": prompt,
                        }
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.2,
                "maxOutputTokens": self.max_output_tokens,
                "responseMimeType": "application/json",
            },
        }

        try:
            with httpx.Client(timeout=self.timeout) as client:
                r = client.post(self.api_url, headers=headers, json=body)
                r.raise_for_status()
                data = r.json()
        except httpx.HTTPStatusError as exc:
            detail = exc.response.text
            retry_after = None
            try:
                payload = exc.response.json()
                detail = payload.get("error", {}).get("message") or detail
            except Exception:
                pass
            try:
                retry_after_header = exc.response.headers.get("retry-after")
                retry_after = float(retry_after_header) if retry_after_header else None
            except ValueError:
                retry_after = None
            raise GeminiAPIError(exc.response.status_code, detail, retry_after=retry_after) from exc
        except Exception:
            raise

        # Try to extract text depending on response shape
        if isinstance(data, dict):
            cand = data.get("candidates")
            if cand and isinstance(cand, list) and len(cand) > 0:
                first = cand[0]
                content = first.get("content")
                if isinstance(content, dict):
                    parts = content.get("parts") or []
                    texts = [part.get("text", "") for part in parts if isinstance(part, dict)]
                    text = "\n".join(t for t in texts if t)
                    if text:
                        return text

                text = first.get("output") or first.get("text")
                if isinstance(text, str):
                    return text

            # Some APIs return a simple 'response' or 'result'
            for k in ("response", "result", "text"):
                if k in data and isinstance(data[k], str):
                    return data[k]

        # fallback to raw json
        return json.dumps(data)
