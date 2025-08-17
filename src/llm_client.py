# src/llm_client.py
import os, re, json, time, hashlib, requests
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

CHAT_API_URL   = os.getenv("CHAT_API_URL") or "https://openrouter.ai/api/v1/chat/completions"
CHAT_API_KEY   = os.getenv("CHAT_API_KEY")
PRIMARY_MODEL  = os.getenv("PRIMARY_MODEL")  or "mistralai/mistral-small-3.2-24b-instruct:free"
FALLBACK_MODEL = os.getenv("FALLBACK_MODEL") or "deepseek/deepseek-r1-0528:free"
LLM_MAX_TOKENS = int(os.getenv("LLM_MAX_TOKENS", "0"))
LLM_THROTTLE_MS= int(os.getenv("LLM_THROTTLE_MS", "0"))

if not CHAT_API_KEY:
    raise RuntimeError("CHAT_API_KEY missing. Put it in .env (CHAT_API_KEY=...)")

def _normalize_url(u: str) -> str:
    u = (u or "").strip().rstrip("/")
    if u.endswith("/v1") or u.endswith("/api/v1"):
        return u + "/chat/completions"
    if u.endswith("/chat/completions"):
        return u
    return u

CHAT_API_URL = _normalize_url(CHAT_API_URL)

CACHE = Path("data/.cache"); CACHE.mkdir(parents=True, exist_ok=True)
HEADERS = {"Authorization": f"Bearer {CHAT_API_KEY}", "Content-Type": "application/json"}

class RateLimitError(RuntimeError): ...

def _cache_key(prompt_text: str, payload: dict, model: str) -> Path:
    h = hashlib.sha256()
    h.update(prompt_text.encode()); h.update(model.encode())
    h.update(json.dumps(payload, sort_keys=True).encode())
    return CACHE / (h.hexdigest()[:20] + ".json")

def _split_prompt(prompt_text: str, payload: dict):
    parts = prompt_text.split("USER:")
    system = parts[0].replace("SYSTEM:", "").strip()
    user = "Here is the input payload as JSON:\n" + json.dumps(payload, ensure_ascii=False, indent=2)
    return system, user

def _strip_code_fences(text: str) -> str:
    s = text.strip()
    m = re.match(r"^```(?:json)?\s*(.*?)\s*```$", s, flags=re.DOTALL)
    return m.group(1).strip() if m else s

def _looks_like_json(text: str) -> bool:
    t = text.lstrip()
    return t.startswith("{") or t.startswith("[")

def _chat_openai(model: str, system: str, user: str, temperature: float, json_mode: bool|str=False) -> str:
    """
    json_mode:
      - False  : no enforcement
      - True   : object-only (OpenAI 'json_object')
      - "array": enforce ARRAY via JSON Schema (supported on OpenRouter)
    """
    body = {
        "model": model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user",   "content": user}
        ],
        "temperature": temperature,
    }
    if LLM_MAX_TOKENS > 0:
        body["max_tokens"] = LLM_MAX_TOKENS

    if json_mode is True:
        body["response_format"] = {"type": "json_object"}
    elif json_mode == "array":
        body["response_format"] = {
            "type": "json_schema",
            "json_schema": {
                "name": "MessageArray",
                "strict": True,
                "schema": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "id":     {"type":"string"},
                            "ts":     {"type":"string"},
                            "sender": {"type":"string"},
                            "text":   {"type":"string"},
                            "tags":   {"type":"array","items":{"type":"string"}},
                            "links": {
                                "type":"array",
                                "items":{
                                    "type":"object",
                                    "properties":{
                                        "type":{"type":"string"},
                                        "id":{"type":"string"}
                                    },
                                    "required":["type","id"]
                                }
                            }
                        },
                        "required": ["id","ts","sender","text","tags","links"],
                        "additionalProperties": True
                    }
                }
            }
        }

    if LLM_THROTTLE_MS > 0:
        time.sleep(LLM_THROTTLE_MS/1000.0)

    r = requests.post(CHAT_API_URL, headers=HEADERS, json=body, timeout=120)
    if r.status_code == 429:
        raise RateLimitError("429: rate limited")

    # If provider rejects json_schema (rare), retry once without response_format
    if r.status_code >= 400 and json_mode == "array":
        try:
            _ = r.json()
        except Exception:
            pass
        body.pop("response_format", None)
        r2 = requests.post(CHAT_API_URL, headers=HEADERS, json=body, timeout=120)
        r2.raise_for_status()
        data = r2.json()
        return data["choices"][0]["message"]["content"]

    r.raise_for_status()
    data = r.json()
    return data["choices"][0]["message"]["content"]

def call_with_fallback(prompt_text: str, payload: dict, *, temperature: float, json_mode: bool|str=False) -> str:
    system, user = _split_prompt(prompt_text, payload)

    # Primary (with cache)
    primary_fp = _cache_key(prompt_text, payload, PRIMARY_MODEL)
    if primary_fp.exists():
        return primary_fp.read_text()
    try:
        out = _chat_openai(PRIMARY_MODEL, system, user, temperature, json_mode)
        out = _strip_code_fences(out)
        if (json_mode in (True, "array")) and not _looks_like_json(out):
            raise ValueError("Primary returned non-JSON content")
        primary_fp.write_text(out)
        return out
    except Exception:
        pass

    # Fallback (with cache)
    fallback_fp = _cache_key(prompt_text + "|fb", payload, FALLBACK_MODEL)
    if fallback_fp.exists():
        return fallback_fp.read_text()
    out = _chat_openai(FALLBACK_MODEL, system, user, temperature, json_mode)
    out = _strip_code_fences(out)
    if (json_mode in (True, "array")) and not _looks_like_json(out):
        raise ValueError("Fallback returned non-JSON content")
    fallback_fp.write_text(out)
    return out
