import json
from pathlib import Path
from src.schemas import DecisionList
from src.llm_client import call_with_fallback
from src.postprocess import extract_json_array_or_object, repair_decisions

PROMPT = (Path(__file__).resolve().parents[1] / "prompts" / "decision_extract_v1.md").read_text()

def _index_messages(messages):
    return {m.get("id"): m for m in messages if isinstance(m.get("id"), str)}

def _fill_missing_ts(repaired:list[dict], msg_by_id:dict[str,dict]):
    first_ts = None
    if msg_by_id:
        try:
            first_ts = next(iter(sorted(msg_by_id.values(), key=lambda x: x.get("ts") or "")))["ts"]
        except Exception:
            first_ts = next(iter(msg_by_id.values())).get("ts")
    for d in repaired:
        if not d.get("ts"):
            ts = None
            for l in d.get("links", []):
                if l.get("type") == "message" and l.get("id") in msg_by_id:
                    ts = msg_by_id[l["id"]].get("ts"); break
            d["ts"] = ts or first_ts or "1970-01-01T00:00:00Z"
    return repaired

def extract_decisions(week:int, available_metrics: list[dict], available_labs: list[dict]):
    messages = json.loads(Path(f"data/messages_week{week:02d}.json").read_text())
    payload = {"messages": messages, "available_metrics": available_metrics, "available_labs": available_labs}
    raw = call_with_fallback(PROMPT, payload, temperature=0.3, json_mode=False)
    try:
        data = json.loads(raw)
    except Exception:
        try:
            data = extract_json_array_or_object(raw)
        except Exception:
            Path(f"data/debug_decisions_w{week:02d}.txt").write_text(raw)
            raise
    if isinstance(data, dict): data = [data]
    repaired = repair_decisions(data, week)
    repaired = _fill_missing_ts(repaired, _index_messages(messages))
    decs = DecisionList.validate_python(repaired)
    Path(f"data/decisions_week{week:02d}.json").write_text(
        json.dumps([d.model_dump(mode="json") for d in decs], indent=2)
    )
    return decs
