# src/time_analytics.py
import argparse, json, re, os
from pathlib import Path
from datetime import datetime, timedelta
from collections import defaultdict
from typing import Dict, Any, List, Tuple, Optional
from math import isfinite

DATA = Path("data")

DOCTORS = {"DrWarren"}
COACHES = {"Ruby", "Advik", "Carla", "Rachel", "Neel"}

SYNC_HINTS = (
    "call", "consult", "consultation", "review", "appointment",
    "check-in", "check in", "televisit", "video", "zoom", "meet"
)
PT_HINTS = ("pt session", "physio", "physiotherapy")

COACH_ASYNC_TAGS = {"coaching","education","plan_update","scheduling","exercise","nutrition","pt"}
DOC_ASYNC_TAGS   = {"labs","lab_order","plan_update","report"}

ASYNC_MIN_COACH_PER_MSG = 2
ASYNC_MIN_DOC_PER_MSG   = 3
DEFAULT_DOC_SYNC_MIN    = 20
DEFAULT_COACH_SYNC_MIN  = 15
SESSION_MERGE_WINDOW    = 45  # minutes

# ---------- I/O helpers ----------

def _load_json(p: Path, default=None):
    try:
        return json.loads(p.read_text())
    except Exception:
        return default

def _iter_messages() -> List[Dict[str,Any]]:
    out=[]
    for fp in sorted(DATA.glob("messages_week*.json")):
        week = int(fp.stem.replace("messages_week",""))
        arr = _load_json(fp, [])
        for m in arr or []:
            m["_week"] = week
            out.append(m)
    return out

# ---------- time parsing / detection ----------

def _ts(dt: str) -> Optional[datetime]:
    if not dt: return None
    try:
        return datetime.fromisoformat(dt.replace("Z","+00:00"))
    except Exception:
        return None

_DURATION_RE = re.compile(r"(\d+(?:\.\d+)?)\s*(?:min|mins|minutes|hr|hour|hours)\b", re.I)

def _extract_minutes(text: str) -> Optional[int]:
    if not text: return None
    m = _DURATION_RE.search(text)
    if not m: return None
    val = float(m.group(1))
    unit = m.group(0).lower()
    if "hr" in unit or "hour" in unit:
        return int(round(val * 60))
    return int(round(val))

def _has_any(text: str, hints: Tuple[str, ...]) -> bool:
    if not text: return False
    t = text.lower()
    return any(h in t for h in hints)

def _session_role(sender: str) -> Optional[str]:
    if sender in DOCTORS: return "doctor"
    if sender in COACHES: return "coach"
    return None

def _is_sync_candidate(msg: Dict[str,Any]) -> bool:
    t = (msg.get("text") or "").lower()
    return _has_any(t, SYNC_HINTS) or _has_any(t, PT_HINTS)

def _async_minutes_for_msg(msg: Dict[str,Any]) -> int:
    sender = msg.get("sender","")
    tags = set(msg.get("tags") or [])
    if sender in COACHES and (tags & COACH_ASYNC_TAGS):
        return ASYNC_MIN_COACH_PER_MSG
    if sender in DOCTORS and (tags & DOC_ASYNC_TAGS):
        return ASYNC_MIN_DOC_PER_MSG
    return 0

def _default_sync_minutes(role: str, msg: Dict[str,Any]) -> int:
    t = (msg.get("text") or "").lower()
    if role == "doctor":
        return DEFAULT_DOC_SYNC_MIN
    if _has_any(t, PT_HINTS):
        return max(DEFAULT_COACH_SYNC_MIN, 30)
    return DEFAULT_COACH_SYNC_MIN

def _iso(dt: Optional[datetime]) -> Optional[str]:
    return dt.isoformat() if dt else None

# ---------- compute summary ----------

def compute_time_summary(messages: List[Dict[str,Any]]) -> Dict[str, Any]:
    msgs = sorted((m for m in messages if _ts(m.get("ts"))), key=lambda m: _ts(m["ts"]))

    weekly_async = defaultdict(lambda: {"doctor": 0, "coach": 0})
    # sessions stored as tuples during computation
    weekly_sync_sessions = defaultdict(lambda: {"doctor": [], "coach": []})  # (start_dt, minutes, meta)

    last_session_end = {"doctor": None, "coach": None}  # datetime | None
    last_session_idx = {"doctor": None, "coach": None}  # int | None

    for m in msgs:
        wk = m.get("_week", 0)
        role = _session_role(m.get("sender",""))
        if role is None:
            continue

        # async bookkeeping
        weekly_async[wk][role] += _async_minutes_for_msg(m)

        # sync session detection/merge
        if _is_sync_candidate(m):
            dt = _ts(m.get("ts"))
            minutes = _extract_minutes(m.get("text") or "") or _default_sync_minutes(role, m)

            if last_session_end[role] and dt and (dt - last_session_end[role]).total_seconds()/60.0 <= SESSION_MERGE_WINDOW:
                idx = last_session_idx[role]
                if idx is not None:
                    old_start, old_min, meta = weekly_sync_sessions[wk][role][idx]
                    new_end = max(old_start + timedelta(minutes=old_min), dt + timedelta(minutes=minutes))
                    new_min = int(round((new_end - old_start).total_seconds() / 60.0))
                    weekly_sync_sessions[wk][role][idx] = (old_start, new_min, meta)
                    last_session_end[role] = new_end
            else:
                start_time = _ts(m.get("ts"))
                end_time = start_time + timedelta(minutes=minutes) if start_time else None
                weekly_sync_sessions[wk][role].append(
                    (start_time, minutes, {
                        "sender": m.get("sender"),
                        "id": m.get("id"),
                        "text": (m.get("text") or "")[:160]
                    })
                )
                last_session_end[role] = end_time
                last_session_idx[role] = len(weekly_sync_sessions[wk][role]) - 1

    # JSON-safe weekly summary (datetimes → ISO)
    weekly: Dict[int, Dict[str, Any]] = {}
    for wk in sorted(set(m.get("_week", 0) for m in msgs)):
        doc_sessions = weekly_sync_sessions[wk]["doctor"]
        coa_sessions = weekly_sync_sessions[wk]["coach"]

        dmins = weekly_async[wk]["doctor"] + sum(mins for _, mins, _ in doc_sessions)
        cmins = weekly_async[wk]["coach"]  + sum(mins for _, mins, _ in coa_sessions)

        weekly[wk] = {
            "doctor": {
                "consult_sessions": len(doc_sessions),
                "minutes": dmins,
                "hours": round(dmins/60.0, 2),
                "breakdown": [
                    {"start": _iso(start), "minutes": mins, **meta}
                    for (start, mins, meta) in doc_sessions
                ],
            },
            "coach": {
                "support_sessions": len(coa_sessions),
                "minutes": cmins,
                "hours": round(cmins/60.0, 2),
                "breakdown": [
                    {"start": _iso(start), "minutes": mins, **meta}
                    for (start, mins, meta) in coa_sessions
                ],
            }
        }

    total_doc_m = sum(v["doctor"]["minutes"] for v in weekly.values())
    total_coa_m = sum(v["coach"]["minutes"] for v in weekly.values())
    total_doc_sessions = sum(v["doctor"]["consult_sessions"] for v in weekly.values())
    total_coa_sessions = sum(v["coach"]["support_sessions"] for v in weekly.values())

    out = {
        "weekly": weekly,  # keys will be stringified before writing/pushing
        "totals": {
            "doctor": {
                "consult_sessions": total_doc_sessions,
                "minutes": total_doc_m,
                "hours": round(total_doc_m/60.0, 2),
            },
            "coach": {
                "support_sessions": total_coa_sessions,
                "minutes": total_coa_m,
                "hours": round(total_coa_m/60.0, 2),
            }
        },
        "assumptions": {
            "async_minutes_per_coach_msg": ASYNC_MIN_COACH_PER_MSG,
            "async_minutes_per_doctor_msg": ASYNC_MIN_DOC_PER_MSG,
            "default_doctor_sync_minutes": DEFAULT_DOC_SYNC_MIN,
            "default_coach_sync_minutes": DEFAULT_COACH_SYNC_MIN,
            "session_merge_window_minutes": SESSION_MERGE_WINDOW,
            "sync_keywords": list(SYNC_HINTS + PT_HINTS),
        }
    }
    return out

# ---------- sanitizers (JSON + Firestore) ----------

def _fs_key(k) -> str:
    """Firestore only accepts non-empty string keys."""
    if isinstance(k, int):
        return f"{k:02d}"  # "01", "02", ...
    s = str(k).strip()
    return s if s else "_"

def _sanitize_values(obj):
    """Make values JSON-safe (datetime → ISO, non-finite floats → 0)."""
    if isinstance(obj, dict):
        return {k: _sanitize_values(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_sanitize_values(x) for x in obj]
    if isinstance(obj, datetime):
        return obj.isoformat()
    if isinstance(obj, float) and not isfinite(obj):
        return 0.0
    return obj

def _json_sanitize(obj):
    """Sanitize for JSON file: convert datetimes and (optionally) stringify non-string keys."""
    if isinstance(obj, dict):
        return {str(k): _json_sanitize(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_json_sanitize(x) for x in obj]
    return _sanitize_values(obj)

def _firestore_sanitize(obj):
    """Sanitize for Firestore: stringify ALL keys; sanitize values."""
    if isinstance(obj, dict):
        return {_fs_key(k): _firestore_sanitize(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_firestore_sanitize(x) for x in obj]
    return _sanitize_values(obj)

# ---------- push to Firestore ----------

def push_to_firestore(user_id: str, summary: Dict[str, Any]):
    from google.cloud import firestore
    project_id = os.getenv("FIREBASE_PROJECT_ID")
    if not project_id:
        raise RuntimeError("FIREBASE_PROJECT_ID missing in .env")
    db = firestore.Client(project=project_id)

    safe = _firestore_sanitize(summary)
    safe["updatedAt"] = firestore.SERVER_TIMESTAMP

    (db.collection("users").document(user_id)
       .collection("meta").document("time_summary")
       .set(safe, merge=True))

    print(f"✓ pushed time_summary for user '{user_id}'")

# ---------- CLI ----------

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--user", default="rohan", help="Firestore doc id for this member")
    ap.add_argument("--push", action="store_true", help="write to Firestore under meta/time_summary")
    ap.add_argument("--print", action="store_true", help="pretty-print totals")
    args = ap.parse_args()

    msgs = _iter_messages()
    summary = compute_time_summary(msgs)

    # write JSON with string keys & ISO datetimes
    outfp = DATA / "time_summary.json"
    outfp.write_text(json.dumps(_json_sanitize(summary), indent=2))
    print(f"✓ wrote {outfp}")

    if args.print:
        t = summary["totals"]
        print("\nTotals:")
        print(f"  Doctor: {t['doctor']['consult_sessions']} consults, {t['doctor']['hours']} h")
        print(f"  Coach : {t['coach']['support_sessions']} sessions, {t['coach']['hours']} h")

    if args.push:
        push_to_firestore(args.user, summary)

if __name__ == "__main__":
    main()
