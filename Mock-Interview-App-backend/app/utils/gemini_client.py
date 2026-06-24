import json
import httpx
from typing import Optional

from app.core.config import settings


class GeminiClient:
    """Minimal Gemini-like client wrapper.

    Expects environment variables:
      GEMINI_API_KEY - the API key/token
      GEMINI_API_URL - optional override of the API URL
    """

    def __init__(self, api_key: Optional[str] = None, api_url: Optional[str] = None, timeout: int = 15):
        # prefer explicit args, then settings from .env via pydantic Settings
        self.api_key = api_key or getattr(settings, "GEMINI_API_KEY", None)
        self.api_url = api_url or getattr(settings, "GEMINI_API_URL", None)
        # default Google style endpoint for text generation (may need override)
        if not self.api_url:
            self.api_url = "https://generativelanguage.googleapis.com/v1beta2/models/text-bison-001:generate"
        self.timeout = timeout

    def generate(self, prompt: str) -> list | str:
        headers = {}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        body = {"prompt": {"text": prompt}, "temperature": 0.2, "maxOutputTokens": 512}

        # First attempt: send Authorization bearer header (works if api_key is an OAuth2 access token)
        try:
            with httpx.Client(timeout=self.timeout) as client:
                r = client.post(self.api_url, headers=headers, json=body)
                r.raise_for_status()
                data = r.json()
                return self._extract_text(data)
        except httpx.HTTPStatusError as exc:
            status = exc.response.status_code if exc.response is not None else None
            # If unauthorized/forbidden and we have an api_key, try sending it as a query param (?key=API_KEY)
            if status in (401, 403) and self.api_key:
                try:
                    url = self.api_url
                    sep = '&' if '?' in url else '?'
                    url_with_key = f"{url}{sep}key={self.api_key}"
                    with httpx.Client(timeout=self.timeout) as client:
                        r2 = client.post(url_with_key, json=body)
                        r2.raise_for_status()
                        data = r2.json()
                        return self._extract_text(data)
                except Exception:
                    # fallthrough to re-raise original
                    raise
            # No fallback or fallback failed: re-raise
            raise
        except Exception:
            # Generic error - bubble up
            raise

    def _extract_text(self, data: dict) -> list | str:
        """Extract main text from common GenAI response shapes."""
        # Try Google-like response first
        if isinstance(data, dict):
            cand = data.get("candidates")
            if cand and isinstance(cand, list) and len(cand) > 0:
                first = cand[0]
                text = first.get("output") or first.get("content") or first.get("text")
                if isinstance(text, str):
                    return text
        # Generic fallbacks
        for k in ("response", "result", "text"):
            if k in data and isinstance(data[k], str):
                return data[k]
        return json.dumps(data)

        # Try to extract text depending on response shape
        # Google-like: data['candidates'][0]['output'] or data['candidates'][0]['content']
        if isinstance(data, dict):
            # Google GenAI v1beta2 shape
            cand = data.get("candidates")
            if cand and isinstance(cand, list) and len(cand) > 0:
                first = cand[0]
                # check common keys
                text = first.get("output") or first.get("content") or first.get("text")
                if isinstance(text, str):
                    return text
                # some forms have {'structured_output': ...}
            # Some APIs return a simple 'response' or 'result'
            for k in ("response", "result", "text"):
                if k in data and isinstance(data[k], str):
                    return data[k]

        # fallback to raw json
        return json.dumps(data)
