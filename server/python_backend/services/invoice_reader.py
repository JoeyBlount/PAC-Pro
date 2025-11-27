# python_backend/services/invoice_reader.py
import base64, json, logging, os
from typing import Any, Dict, Optional
import httpx

log = logging.getLogger(__name__)

class InvoiceReader:
    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None, timeout: int = 60):
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        if not self.api_key:
            raise RuntimeError("OPENAI_API_KEY not set in environment.")
        self.model = model or os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        self.timeout = timeout
        self.url = "https://api.openai.com/v1/chat/completions"

    @staticmethod
    def _mime_from_filename(name: Optional[str]) -> str:
        if not name: return "image/png"
        n = name.lower()
        if n.endswith((".jpg", ".jpeg")): return "image/jpeg"
        if n.endswith(".png"): return "image/png"
        if n.endswith(".webp"): return "image/webp"
        if n.endswith((".heic", ".heif")): return "image/heic"
        return "image/png"

    async def read_bytes(self, image_bytes: bytes, filename: Optional[str] = None) -> Dict[str, Any]:
        b64 = base64.b64encode(image_bytes).decode("utf-8")
        mime = self._mime_from_filename(filename)
        data_url = f"data:{mime};base64,{b64}"

        prompt = (
            "Extract the following from this invoice image and return a raw JSON object with fields:\n"
            "1. invoiceNumber (string, can be found at the top-right corner of the invoice)\n"
            "2. invoiceDate (MM/DD/YYYY string, can be found at the top-right corner of the invoice)\n"
            "3. companyName (string, look for 'Remit To:', only return the company name and not the address)\n"
            "4. items (array of { category: string, amount: number }), at the bottom, look for 'Description' for category, and 'Total' for amount\n"
            "Return ONLY valid JSON. Do NOT wrap in code blocks."
        )

        payload = {
            "model": self.model,
            "messages": [{
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": data_url}},
                ],
            }],
            "max_tokens": 1000,
            "temperature": 0.0,
        }
        headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}

        log.info("📡 Sending invoice to OpenAI (%s)", self.model)
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.post(self.url, headers=headers, json=payload)

        text = resp.text
        if resp.status_code >= 400:
            log.error("OpenAI error %s: %s", resp.status_code, text)
            raise RuntimeError(f"OpenAI API error {resp.status_code}: {text}")

        data = resp.json()
        content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
        cleaned = content.strip().strip("`")
        if cleaned.lower().startswith("json"):
            cleaned = cleaned[4:].strip()

        try:
            return json.loads(cleaned)
        except Exception as e:
            log.exception("Failed to parse JSON from model output")
            raise ValueError(f"Failed to parse JSON from OpenAI output:\n{cleaned}") from e
