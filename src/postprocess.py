import json, re
from json import JSONDecodeError
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any

ALLOWED_SENDERS = {"Member","Ruby","DrWarren","Advik","Carla","Rachel","Neel"}
CANON_TAGS = {
    "exercise","nutrition","sleep","labs","lab","lab_order",
    "education","coaching","travel","report",
    "completion","miss","plan","plan_update","plan_change",
    "scheduling","pt","question"
}
ALLOWED_LINK_TYPES = {"message","metric","lab","decision"}

# ------ JSON recovery ------

def _strip_code_fences(s: str) -> str:
    s = s.strip()
    if s.startswith("```"):
        s = re.sub(r"^```(?:json)?\s*", "", s)
        s = re.sub(r"\s*```$", "", s)
    return s

def _normalize_quotes(s: str) -> str:
    return (s.replace("“", '"').replace("”", '"')
             .replace("’", "'").replace("‘", "'"))

def _remove_trailing_commas(s: str) -> str:
    return re.sub(r",\s*([}\]])", r"\1", s)

def _find_balanced_array(s: str) -> str | None:
    start = s.find("[")
    if start == -1: return None
    depth = 0; in_str = False; esc = False
    for i, ch in enumerate(s[start:], start):
        if in_str:
            if esc: esc = False
            elif ch == "\\": esc = True
            elif ch == '"': in_str = False
            continue
        else:
            if ch == '"': in_str = True
            elif ch == "[": depth += 1
            elif ch == "]":
                depth -= 1
                if depth == 0: return s[start:i+1]
    return None

def clean_json_like(text: str) -> str:
    t = _strip_code_fences(_normalize_quotes(text))
    arr = _find_balanced_array(t)
    if arr: core = arr
    else:
        s, e = t.find("{"), t.rfind("}")
        core = t[s:e+1] if (s!=-1 and e!=-1 and e> s) else t
    core = _remove_trailing_commas(core)
    core = re.sub(r"\}\s*\{", "},{", core)
    core = re.sub(r"\]\s*\[", "],[", core)
    core = re.sub(r"(\[)\s*,", r"\1", core)
    core = re.sub(r"(\{)\s*,", r"\1", core)
    return core.strip()

def _first_json_value(s: str):
    dec = json.JSONDecoder()
    return dec.raw_decode(s.lstrip())

def extract_json_array(text: str) -> list:
    raw = clean_json_like(text)
    try:
        obj, _ = _first_json_value(raw)
        if isinstance(obj, list): return obj
        if isinstance(obj, dict): return [obj]
    except JSONDecodeError:
        pass
    s, e = raw.find("["), raw.rfind("]")
    if s!=-1 and e!=-1 and e> s:
        candidate = _remove_trailing_commas(raw[s:e+1])
        try:
            obj, _ = _first_json_value(candidate)
            if isinstance(obj, list): return obj
        except JSONDecodeError:
            if '"' not in candidate and "'" in candidate:
                obj, _ = _first_json_value(candidate.replace("'", '"'))
                if isinstance(obj, list): return obj
    s, e = raw.find("{"), raw.rfind("}")
    if s!=-1 and e!=-1 and e> s:
        candidate = _remove_trailing_commas(raw[s:e+1])
        try:
            obj, _ = _first_json_value(candidate)
            return obj if isinstance(obj, list) else [obj]
        except JSONDecodeError:
            if '"' not in candidate and "'" in candidate:
                obj, _ = _first_json_value(candidate.replace("'", '"'))
                return obj if isinstance(obj, list) else [obj]
    raise ValueError("Could not coerce model output into a JSON array")

def extract_json_array_or_object(text: str):
    raw = clean_json_like(text)
    try:
        obj, _ = _first_json_value(raw)
        return obj
    except JSONDecodeError:
        try:
            return extract_json_array(raw)
        except Exception:
            s, e = raw.find("{"), raw.rfind("}")
            if s!=-1 and e!=-1 and e> s:
                candidate = _remove_trailing_commas(raw[s:e+1])
                obj, _ = _first_json_value(candidate)
                return obj
            raise

# ------ message & decision repair ------

def _parse_ts(s: str | None):
    if not s: return None
    try:
        return datetime.fromisoformat(s.replace("Z","+00:00"))
    except Exception:
        return None

def _canon_tags(tags):
    out=[]
    for t in (tags or []):
        t = str(t).strip().lower()
        if t == "lab": t = "labs"
        if t in CANON_TAGS: out.append(t)
    return out

LAB_HINTS      = ("lab","lipid","cbc","a1c","fasting","hdl","ldl","trigly","thyroid","vitamin","tsh")
DECISION_HINTS = ("decision","plan_change","planupdate","referral","escalation","goal","review")
METRIC_HINTS   = ("hrv","rhr","sleep","steps","weight","bp","glucose","spo2","vo2","bmi")

def _coerce_link_type(orig_type: str | None, link_id: str) -> str:
    t = (orig_type or "").lower().strip()
    lid = (link_id or "").lower()
    if t in ALLOWED_LINK_TYPES: return t
    if any(k in lid for k in LAB_HINTS):      return "lab"
    if any(k in lid for k in DECISION_HINTS): return "decision"
    if any(k in lid for k in METRIC_HINTS):   return "metric"
    return "message"

def _norm_link(l):
    if isinstance(l, str):
        lid = l.strip()
        if not lid: return None
        t = _coerce_link_type(None, lid)
        return {"type": t, "id": lid}
    if isinstance(l, dict):
        lid = str(l.get("id","")).strip()
        if not lid: return None
        t = _coerce_link_type(l.get("type"), lid)
        return {"type": t, "id": lid}
    return None

def _first6(s: str) -> str:
    return " ".join(re.sub(r"\s+", " ", s).strip().split()[:6]).lower()

def repair_messages(items: List[Dict[str,Any]], week: int, week_start_iso: str) -> List[Dict[str,Any]]:
    tz = timezone(timedelta(hours=8))
    start = datetime.fromisoformat(week_start_iso).astimezone(tz)
    end = (start + timedelta(days=6, hours=23, minutes=59))
    t0 = start.replace(hour=9, minute=30, second=0, microsecond=0)

    seen_prefix: dict[str,set[str]] = {}

    out=[]
    for i, m in enumerate(items or [], start=1):
        if not isinstance(m, dict): continue
        sender = str(m.get("sender","Member")).strip()
        if sender == "Rohan": sender = "Member"
        if sender not in ALLOWED_SENDERS: sender = "Member"

        text = str(m.get("text","")).strip()
        # ensure no duplicate first-6 words per sender
        pref = _first6(text)
        used = seen_prefix.setdefault(sender,set())
        if pref in used:
            text = "Note — " + text
            pref = _first6(text)
        used.add(pref)

        tags = _canon_tags(m.get("tags"))

        links=[]
        for l in m.get("links", []) or []:
            nl = _norm_link(l)
            if nl and nl.get("id"):
                # force to allowed types
                nl["type"] = _coerce_link_type(nl.get("type"), nl["id"])
                if nl["type"] in ALLOWED_LINK_TYPES:
                    links.append(nl)

        ts = _parse_ts(m.get("ts"))
        if ts is None or not (start <= ts <= end):
            ts = t0 + timedelta(minutes=5*i)

        mid = m.get("id")
        if not isinstance(mid, str) or not mid.strip():
            mid = f"w{week:02d}-m{i:02d}"

        out.append({
            "id": mid,
            "ts": ts.isoformat().replace("+00:00","Z") if ts.tzinfo and ts.utcoffset()==timedelta(0)
                   else ts.isoformat(),
            "sender": sender,
            "text": text,
            "tags": tags,
            "links": links
        })
    out.sort(key=lambda x: x["ts"])
    return out

# Decisions: map free-form kinds to your schema set
SCHEMA_DECISION_KINDS = {
    "MedStart","MedStop","Therapy","ExerciseChange","TestOrder","PlanUpdate","Referral"
}

def _map_kind_to_schema(kind: str, summary: str = "") -> str:
    k = (kind or "").strip().lower()
    s = (summary or "").lower()
    if k in {"exercisechange","exercise_change"}: return "ExerciseChange"
    if k in {"testorder","lab_order","laborder","lab"}: return "TestOrder"
    if k in {"planupdate","plan_change","plan","update"}: return "PlanUpdate"
    if k in {"referral","escalation"}: return "Referral"
    if k in {"therapy","physio","physiotherapy"}: return "Therapy"
    if k in {"medstart","startmed","start_med"}: return "MedStart"
    if k in {"medstop","stopmed","stop_med"}: return "MedStop"
    if ("start" in s and any(t in s for t in ("mg","tablet","capsule","dose","med"))) : return "MedStart"
    if ("stop" in s  and any(t in s for t in ("mg","tablet","capsule","dose","med"))) : return "MedStop"
    if "referr" in s or "specialist" in s: return "Referral"
    if "order" in s and "lab" in s: return "TestOrder"
    if "exercise" in s and any(t in s for t in ("progress","increase","deload","switch","update")): return "ExerciseChange"
    return "PlanUpdate"

def repair_decisions(items, week:int, week_start_iso: str | None = None):
    tz = timezone(timedelta(hours=8))
    base = None
    if week_start_iso:
        try:
            base = datetime.fromisoformat(week_start_iso).astimezone(tz).replace(hour=9, minute=0, second=0, microsecond=0)
        except Exception:
            base = None

    src = items if isinstance(items, list) else [items]
    out=[]
    for i, d in enumerate(src or [], start=1):
        if not isinstance(d, dict): continue
        summary = str(d.get("summary","")).strip()
        kind_out = _map_kind_to_schema(d.get("kind"), summary)
        if kind_out not in SCHEMA_DECISION_KINDS:
            kind_out = "PlanUpdate"

        links=[]
        for l in d.get("links", []) or []:
            nl = _norm_link(l)
            if nl and nl.get("id"):
                nl["type"] = _coerce_link_type(nl.get("type"), nl["id"])
                if nl["type"] in ALLOWED_LINK_TYPES:
                    links.append(nl)

        did = d.get("id")
        if not isinstance(did, str) or not did.strip():
            did = f"w{week:02d}-d{i:02d}"

        ts = _parse_ts(d.get("ts"))
        if ts is None and base is not None:
            ts = base + timedelta(minutes=60 + 10*i)
        ts_str = ts.isoformat().replace("+00:00","Z") if ts and ts.tzinfo and ts.utcoffset()==timedelta(0) else (ts.isoformat() if ts else "")

        out.append({
            "id": did,
            "ts": ts_str,
            "kind": kind_out,
            "summary": summary,
            "rationale": str(d.get("rationale","")).strip(),
            "appliesTo": d.get("appliesTo") or d.get("applies_to") or [],
            "links": links
        })
    return out
