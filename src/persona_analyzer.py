# src/persona_analyzer.py
import argparse, glob, json
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Tuple, Optional

# Optional LLM summary (only used if --llm is passed)
try:
    from src.llm_client import call_with_fallback
except Exception:
    call_with_fallback = None

DATA = Path("data")

# ---------- loaders ----------
def _load_json(p: Path, default=None):
    try:
        return json.loads(p.read_text())
    except Exception:
        return default

def load_all_messages() -> List[Dict[str, Any]]:
    msgs = []
    for fp in sorted(DATA.glob("messages_week*.json")):
        week = int(fp.stem.replace("messages_week", ""))
        arr = _load_json(fp, [])
        for m in arr or []:
            m["_week"] = week
            msgs.append(m)
    return msgs

def load_all_decisions() -> List[Dict[str, Any]]:
    decs = []
    for fp in sorted(DATA.glob("decisions_week*.json")):
        week = int(fp.stem.replace("decisions_week", ""))
        arr = _load_json(fp, [])
        for d in arr or []:
            d["_week"] = week
            decs.append(d)
    return decs

# ---------- stats ----------
def _iso(dt: str) -> Optional[datetime]:
    if not dt: return None
    try:
        return datetime.fromisoformat(dt.replace("Z", "+00:00"))
    except Exception:
        return None

def compute_stats(msgs: List[Dict[str, Any]], decs: List[Dict[str, Any]]) -> Dict[str, Any]:
    if not msgs:
        return {"total_messages": 0, "notes": "no messages found"}

    total = len(msgs)
    by_sender = Counter(m.get("sender") for m in msgs)
    member_msgs = [m for m in msgs if m.get("sender") == "Member"]

    tags_all = []
    for m in msgs:
        tags_all.extend(m.get("tags") or [])
    tag_counts = Counter(tags_all)

    comp = tag_counts.get("completion", 0)
    miss = tag_counts.get("miss", 0)
    adherence_den = max(1, comp + miss)
    adherence_ratio = comp / adherence_den

    member_questions = sum(1 for m in member_msgs if "question" in (m.get("tags") or []))
    q_rate = member_questions / max(1, len(member_msgs))

    # Time-of-day & day-of-week preferences (from member messages)
    hour_bin = Counter()
    dow_bin = Counter()
    for m in member_msgs:
        dt = _iso(m.get("ts"))
        if dt:
            hour_bin[dt.hour] += 1
            dow_bin[dt.strftime("%A")] += 1

    top_hours = [h for h, _ in hour_bin.most_common(2)]
    top_days = [d for d, _ in dow_bin.most_common(2)]

    # Topic frequencies
    topic_counts = {
        "exercise": tag_counts.get("exercise", 0),
        "nutrition": tag_counts.get("nutrition", 0),
        "sleep": tag_counts.get("sleep", 0),
        "travel": tag_counts.get("travel", 0),
        "labs": tag_counts.get("labs", 0) + tag_counts.get("lab_order", 0),
        "education": tag_counts.get("education", 0),
        "scheduling": tag_counts.get("scheduling", 0),
        "coaching": tag_counts.get("coaching", 0),
        "report": tag_counts.get("report", 0),
    }

    travel_weeks = len({m["_week"] for m in msgs if "travel" in (m.get("tags") or [])})
    plan_updates = sum(1 for m in msgs if "plan_update" in (m.get("tags") or []))

    # simple decision tallies
    dec_kinds = Counter(d.get("kind") for d in decs)

    return {
        "total_messages": total,
        "by_sender": dict(by_sender),
        "member_share": by_sender.get("Member", 0) / total,
        "adherence": {"completion": comp, "miss": miss, "ratio": round(adherence_ratio, 3)},
        "member_questions": member_questions,
        "question_rate": round(q_rate, 3),
        "top_hours_local": top_hours,    # e.g., [9, 20]
        "top_days": top_days,             # e.g., ["Monday","Thursday"]
        "topics": topic_counts,
        "travel_weeks": travel_weeks,
        "plan_updates": plan_updates,
        "decision_counts": dict(dec_kinds),
        "weeks_covered": len({m["_week"] for m in msgs}),
    }

# ---------- rule-based persona ----------
def classify_persona(s: Dict[str, Any]) -> Tuple[str, float, List[str]]:
    """Return persona_name, confidence, bullet_evidence"""
    if s.get("total_messages", 0) == 0:
        return "Unknown", 0.0, ["No messages to analyze"]

    member_share = s.get("member_share", 0.0)
    q_rate = s.get("question_rate", 0.0)
    ratio = s.get("adherence", {}).get("ratio", 0.0)
    topics = s.get("topics", {})
    travel_weeks = s.get("travel_weeks", 0)

    evidence = []
    # trait bars
    traits = {
        "self_starter": ratio >= 0.6 and q_rate <= 0.15,
        "curious_optimizer": ratio >= 0.55 and q_rate >= 0.25,
        "busy_juggler": 0.35 <= ratio < 0.55 or topics.get("scheduling", 0) >= 6,
        "at_risk": ratio < 0.35,
        "data_lover": topics.get("labs", 0) + topics.get("report", 0) >= 4,
    }

    if traits["self_starter"]:
        persona = "Self-Starter"
        evidence.append("High completion, low question rate")
    elif traits["curious_optimizer"]:
        persona = "Curious Optimizer"
        evidence.append("Good adherence with frequent questions/learning")
    elif traits["busy_juggler"]:
        persona = "Busy Juggler"
        evidence.append("Mixed adherence and lots of scheduling friction")
    elif traits["at_risk"]:
        persona = "At-Risk"
        evidence.append("Low adherence across weeks")
    else:
        persona = "Balanced Improver"
        evidence.append("Moderate adherence with steady engagement")

    if travel_weeks >= max(1, s.get("weeks_covered", 1)//5):
        evidence.append("Travel disrupts routines")

    if member_share >= 0.45:
        evidence.append("Member contributes actively to the conversation")

    # confidence: fraction of “fired” rules
    fired = sum(1 for k,v in traits.items() if v)
    confidence = min(0.9, 0.4 + 0.12 * fired)

    return persona, round(confidence, 2), evidence

def coaching_tips(s: Dict[str, Any]) -> List[str]:
    tips = []
    ratio = s.get("adherence", {}).get("ratio", 0.0)
    q_rate = s.get("question_rate", 0.0)
    hours = s.get("top_hours_local", [])
    days  = s.get("top_days", [])

    if ratio < 0.5:
        tips.append("Use micro-sessions (10–15m) and offer reschedule buttons.")
    else:
        tips.append("Add small progressive overload and celebrate streaks weekly.")

    if q_rate >= 0.25:
        tips.append("Include short explainers and 1 actionable experiment per week.")
    else:
        tips.append("Keep messages short and decision-oriented; avoid heavy theory.")

    if hours:
        when = " & ".join(f"{h:02d}:00" for h in hours[:2])
        tips.append(f"Send nudges around {when} local; that’s when they engage most.")

    if days:
        tips.append(f"Prefer check-ins on {', '.join(days[:2])}.")

    return tips

def build_persona_json(stats: Dict[str, Any], member_id: str, llm_summary: Optional[str]) -> Dict[str, Any]:
    name, conf, evidence = classify_persona(stats)
    return {
        "memberId": member_id,
        "persona": name,
        "confidence": conf,
        "stats": stats,
        "traits_evidence": evidence,
        "coaching_tips": coaching_tips(stats),
        "llm_summary": llm_summary or ""
    }

# ---------- optional LLM summary ----------
def make_llm_summary(stats: Dict[str, Any]) -> str:
    if call_with_fallback is None:
        return ""
    system = "You are a health coach data summarizer. Reply with ~120 words, 2 short paragraphs. No advice wording; just traits and how to communicate effectively."
    user = "Here are behavior stats for one member as JSON:\n" + json.dumps(stats, indent=2)
    try:
        return call_with_fallback("SYSTEM:\n"+system+"\n\nUSER:\n", {"stats": stats}, temperature=0.4, json_mode=False).strip()
    except Exception:
        return ""

# ---------- Firestore push ----------
def push_persona_to_firestore(member_id: str, persona_json: Dict[str, Any]):
    from google.cloud import firestore
    import os
    project_id = os.getenv("FIREBASE_PROJECT_ID")
    if not project_id:
        raise RuntimeError("FIREBASE_PROJECT_ID missing in .env")
    db = firestore.Client(project=project_id)
    (db.collection("users").document(member_id)
       .collection("meta").document("persona")
       .set(persona_json, merge=True))

# ---------- cli ----------
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--user", default="rohan", help="Firestore user/doc id and memberId in output")
    ap.add_argument("--push", action="store_true", help="write to Firestore users/{user}/meta/persona")
    ap.add_argument("--llm", action="store_true", help="add a short LLM-written summary (optional)")
    args = ap.parse_args()

    msgs = load_all_messages()
    decs = load_all_decisions()
    stats = compute_stats(msgs, decs)

    llm_text = make_llm_summary(stats) if args.llm else ""
    persona = build_persona_json(stats, args.user, llm_text)

    # save locally
    outfp = DATA / "persona.json"
    outfp.write_text(json.dumps(persona, indent=2))
    print(f"✓ persona written to {outfp}")

    if args.push:
        push_persona_to_firestore(args.user, persona)
        print(f"✓ pushed to Firestore → users/{args.user}/meta/persona")

if __name__ == "__main__":
    main()
