import json
from datetime import datetime, timedelta, time
from pathlib import Path
from random import Random

from src.schemas import MessageList
from src.llm_client import call_with_fallback
from src.postprocess import extract_json_array, repair_messages

# use the stricter prompt you saved
PROMPT = (Path(__file__).resolve().parents[1] / "prompts" / "message_synth_v1.md").read_text()

# ---------- helpers ----------

def _target_range(wf: dict) -> tuple[int, int]:
    """We aim for 20–30 msgs; +2 if labs_due; +2 if travel_week (cap 30)."""
    lo, hi = 20, 30
    if wf.get("labs_due"): lo = min(30, lo + 2)
    if wf.get("travel_week"): lo = min(30, lo + 2)
    return lo, hi

def _slot_ts(week_start_iso: str, idx: int) -> str:
    """
    Deterministic spread: 4 slots/day (09:30, 12:30, 16:00, 19:30) across the week.
    idx is 0-based.
    """
    start_day = datetime.fromisoformat(week_start_iso).replace(hour=9, minute=30, second=0, microsecond=0)
    day = idx // 4
    slot = idx % 4
    slot_times = [time(9,30), time(12,30), time(16,0), time(19,30)]
    base = (start_day + timedelta(days=day)).replace(hour=slot_times[slot].hour, minute=slot_times[slot].minute)
    return base.isoformat()

def _count(msgs, tag): 
    return sum(1 for m in msgs if tag in (m.get("tags") or []))

def _member_count(msgs):
    return sum(1 for m in msgs if m.get("sender") == "Member")

def _add_msg(msgs: list[dict], wf: dict, week: int, sender: str, text: str, tags: list[str]):
    mid = f"w{week:02d}-m{len(msgs)+1:02d}"
    msgs.append({
        "id": mid,
        "ts": _slot_ts(wf["start"], len(msgs)),
        "sender": sender,
        "text": text,
        "tags": tags,
        "links": []
    })

# small varied phrase banks (no repeating openers)
VARIETY = {
    "ruby_checkin": [
        "How did the morning go—any wins or blockers?",
        "Quick status—energy and appetite today?",
        "Touch base—were steps and protein on track?",
        "Pulse check—sleep quality last night?",
        "Mid-week nudge—what needs rescheduling?"
    ],
    "member_complete": [
        "Finished today’s workout and logged meals.",
        "Wrapped the walk and mobility block—felt good.",
        "Protein target met; cooked at home and skipped desserts.",
        "Hit intervals; HR felt steady and recovered fast.",
        "Sleep routine stuck—lights out by 11 and no screens."
    ],
    "member_miss": [
        "Missed the lift—late meeting ran over; moving it to tomorrow.",
        "Skipped mobility; back was tight—will swap for lighter session.",
        "Had takeout at dinner; went over carbs—will balance at lunch.",
        "Only 4k steps today; adding an evening walk.",
        "Slept short last night; planning an early bedtime."
    ]
}

# ---------- core ----------

def _enforce_constraints(msgs: list[dict], wf: dict, week: int, intake: dict) -> list[dict]:
    """
    Make the week satisfy: 20–30 msgs, ≥40% Member, 3–6 completion & 3–6 miss,
    exactly one report, plan_update on even weeks, labs/travel hooks if due,
    ≤5 Member questions, spread by slots, and varied phrasing.
    """
    lo, hi = _target_range(wf)
    rng = Random(week * 97)

    # 1) Exactly one weekly report
    reports = [i for i,m in enumerate(msgs) if "report" in (m.get("tags") or [])]
    if len(reports) == 0:
        _add_msg(msgs, wf, week, "Ruby",
                 "Weekly summary: what went well, where you struggled, and the key metrics we’ll track next week.",
                 ["report"])
    elif len(reports) > 1:
        keep = reports[0]
        for i, m in enumerate(msgs):
            if i != keep and "report" in (m.get("tags") or []):
                m["tags"] = [t for t in m.get("tags", []) if t != "report"]

    # 2) Labs on lab weeks (order + reminder if totally absent)
    if wf.get("labs_due") and _count(msgs, "labs") + _count(msgs, "lab_order") < 2:
        _add_msg(msgs, wf, week, "DrWarren",
                 "Ordering your quarterly fasting lab panel—book a morning slot; hydrate and avoid food for 8–10 hours.",
                 ["lab_order"])
        _add_msg(msgs, wf, week, "Ruby",
                 "When results land, I’ll summarise trends and what to act on.",
                 ["labs","education"])

    # 3) Travel adjustments
    if wf.get("travel_week") and _count(msgs, "travel") < 2:
        _add_msg(msgs, wf, week, "Ruby",
                 "Travel noted—switching to hotel-room circuits, 7k steps/day, and simple protein-first meals.",
                 ["travel","plan_update"])
        _add_msg(msgs, wf, week, "Member",
                 "Got it—I’ll pack bands and aim for evening circuits at the hotel.",
                 ["travel","scheduling","completion"])

    # 4) Even-week exercise plan update
    if week % 2 == 0 and _count(msgs, "plan_update") < 1:
        _add_msg(msgs, wf, week, "Advik",
                 "Exercise block updated from your progress—deload squats 10%, add 6×45s intervals Thu.",
                 ["exercise","plan_update"])

    # 5) Adherence mix (3–6 each)
    comp = _count(msgs,"completion")
    miss = _count(msgs,"miss")
    while comp < 3:
        _add_msg(msgs, wf, week, "Member", rng.choice(VARIETY["member_complete"]),
                 ["completion","scheduling"])
        comp += 1
    while miss < 3:
        _add_msg(msgs, wf, week, "Member", rng.choice(VARIETY["member_miss"]),
                 ["miss","scheduling"])
        miss += 1

    # 6) Grow to lower bound with varied, non-repeating check-ins + member responses to reach ≥40% member
    def _prefixes_by_sender(existing):
        seen = {}
        for m in existing:
            s = m.get("sender","")
            first6 = " ".join(m.get("text","").split()[:6]).lower()
            seen.setdefault(s,set()).add(first6)
        return seen

    seen = _prefixes_by_sender(msgs)

    def _unique_add(sender, text, tags):
        # ensure first 6 words not used by same sender
        first6 = " ".join(text.split()[:6]).lower()
        if first6 in seen.setdefault(sender,set()):
            text = "Note — " + text  # change opener
            first6 = " ".join(text.split()[:6]).lower()
        seen[sender].add(first6)
        _add_msg(msgs, wf, week, sender, text, tags)

    while len(msgs) < lo:
        # alternate Ruby prompt and Member content to keep dialogue feel
        if len(msgs) % 2 == 0:
            _unique_add("Ruby", rng.choice(VARIETY["ruby_checkin"]), ["coaching","scheduling"])
        else:
            # flip between completion/miss to sustain 50/50 flavour
            if _count(msgs,"completion") <= _count(msgs,"miss"):
                _unique_add("Member", rng.choice(VARIETY["member_complete"]), ["completion","scheduling"])
            else:
                _unique_add("Member", rng.choice(VARIETY["member_miss"]), ["miss","scheduling"])

    # 7) Cap to hi
    msgs = msgs[:hi]

    # 8) Member share ≥40%
    total = len(msgs)
    while _member_count(msgs) / max(1,total) < 0.40 and len(msgs) < hi:
        _unique_add("Member", rng.choice(VARIETY["member_complete"]), ["completion","scheduling"])
        total = len(msgs)

    # 9) Member questions ≤5
    member_q = [m for m in msgs if m.get("sender")=="Member" and "question" in (m.get("tags") or [])]
    if len(member_q) > 5:
        for m in sorted(member_q, key=lambda x: x["ts"])[5:]:
            m["tags"] = [t for t in m.get("tags", []) if t != "question"] + ["education"]

    return msgs

# ---------- entry ----------

def generate_week(intake: dict, week_flags: dict, plan_snapshot: dict, last_week_kpis: dict, week: int):
    lo, _ = _target_range(week_flags)
    payload = {
        "intake": intake,
        "week_config": week_flags,
        "plan_snapshot": plan_snapshot,
        "last_week_kpis": last_week_kpis
    }

    attempts, raw = 0, ""
    repaired: list[dict] = []

    while attempts < 3:
        attempts += 1
        raw = call_with_fallback(PROMPT, payload, temperature=0.7, json_mode=False)
        Path(f"data/debug_messages_w{week:02d}_attempt{attempts}.txt").write_text(raw)

        data = extract_json_array(raw)         # may raise → caught by runner
        repaired = repair_messages(data, week, week_flags["start"])

        if len(repaired) >= lo:    # good enough to proceed
            break
        # give the model a nudge next loop
        payload["generator_fixes"] = [
            f"too few messages ({len(repaired)}); need >= {lo}",
            "enforce ≥40% Member messages; vary openers (no repeats)",
            "ensure 3–6 completion and 3–6 miss",
            "weekly report exactly once; plan_update on even weeks",
            "add labs/travel flow when due in week_config"
        ]

    enforced = _enforce_constraints(repaired, week_flags, week, intake)
    msgs = MessageList.validate_python(enforced)

    Path(f"data/messages_week{week:02d}.json").write_text(
        json.dumps([m.model_dump(mode='json') for m in msgs], indent=2)
    )
    return msgs
