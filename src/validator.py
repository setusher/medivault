from typing import Tuple, List
from datetime import datetime, time, timezone, timedelta

ALLOWED_SENDERS = {"Member","Ruby","DrWarren","Advik","Carla","Rachel","Neel"}

def _parse(ts: str) -> datetime:
    return datetime.fromisoformat(ts.replace("Z","+00:00"))

def _within_week(ts: str, start: str, end: str) -> bool:
    t = _parse(ts)
    s = datetime.fromisoformat(start)
    e = datetime.fromisoformat(end)
    return s <= t <= e

def _sg_date(ts: str) -> str:
    # interpret ISO as local +08:00 if not already; then return date key
    t = _parse(ts)
    if t.tzinfo is None:
        t = t.replace(tzinfo=timezone(timedelta(hours=8)))
    return t.astimezone(timezone(timedelta(hours=8))).date().isoformat()

def validate_messages(msgs: list[dict], week_flags: dict) -> Tuple[bool, List[str]]:
    errs: List[str] = []

    # shape & sender & time window
    for m in msgs:
        sdr = m.get("sender")
        if sdr not in ALLOWED_SENDERS:
            errs.append(f"bad sender {sdr}")
        if not isinstance(m.get("id",""), str):
            errs.append("id not string")
        ts = m.get("ts","")
        if not _within_week(ts, week_flags["start"], week_flags["end"]):
            errs.append("timestamp out of week range")
        # must be between 08:00 and 21:00 SG
        t = _parse(ts).timetz()
        if not (time(8,0) <= time(t.hour, t.minute) <= time(21,0)):
            errs.append("timestamp outside daytime window")

    # quantity target (20–30 typical; allow up to 34)
    n = len(msgs)
    if n < 20: errs.append(f"too few messages ({n})")
    if n > 34: errs.append(f"too many messages ({n})")

    # distinct days ≥4
    days = { _sg_date(m.get("ts","")) for m in msgs }
    if len(days) < 4:
        errs.append(f"too few active days ({len(days)} < 4)")

    # member share ≥40%
    member_msgs = sum(1 for m in msgs if m.get("sender")=="Member")
    if member_msgs / max(1,n) < 0.40:
        errs.append("member share < 40%")

    # adherence mix
    tags = [t for m in msgs for t in (m.get("tags") or [])]
    if tags.count("completion") < 3 or tags.count("miss") < 3:
        errs.append("weak adherence mix (need >=3 completion and >=3 miss)")

    # questions by member ≤5
    member_questions = sum(1 for m in msgs if m.get("sender")=="Member" and "question" in (m.get("tags") or []))
    if member_questions > 5:
        errs.append(f"too many member questions ({member_questions} > 5)")

    # travel content on travel weeks
    if week_flags.get("travel_week") and "travel" not in tags:
        errs.append("travel week missing travel-tagged chat")

    # exercise plan update on even weeks
    if week_flags["week"] % 2 == 0 and "plan_update" not in tags:
        errs.append("even week missing plan_update")

    # labs on lab-due weeks
    if week_flags.get("labs_due") and ("labs" not in tags and "lab_order" not in tags):
        errs.append("labs due week missing labs content")

    # exactly one weekly report
    if tags.count("report") == 0:
        errs.append("missing weekly report message")
    if tags.count("report") > 1:
        errs.append("more than one weekly report")

    ok = len(errs) == 0
    return ok, errs
