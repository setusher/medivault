import os, json
from pathlib import Path
from tqdm.auto import tqdm

from src.journey_calendar import build_calendar
from src.synth_metrics_labs import synth_metrics, synth_labs
from src.generate_week import generate_week
from src.validator import validate_messages
from src.extract_decisions import extract_decisions
from src.llm_client import RateLimitError

DATA = Path("data")

def _load_json(path: Path):
    try: return json.loads(path.read_text())
    except Exception: return None

def _slice_weeks(cal):
    rng = os.getenv("WEEK_RANGE")  # e.g., "1-17"
    if not rng: return cal
    a, b = rng.split("-"); lo, hi = int(a), int(b)
    return [wf for wf in cal if lo <= wf["week"] <= hi]

def main():
    intake = json.loads((DATA / "intake.json").read_text())
    cal = _slice_weeks(build_calendar())

    tqdm.write("Synthesizing metrics & labs…")
    metrics = synth_metrics(cal[0]["start"], weeks=32)
    labs    = synth_labs(cal[0]["start"])

    plan = {"exercise":"v1.0 - 3x/wk","nutrition":"Mediterranean","supplements":[]}
    kpis  = {"HRV_7d":45.0,"RHR_7d":60.0,"Sleep_7d":7.0}

    overall = tqdm(total=len(cal), desc="Weeks", unit="week")

    for wf in cal:
        w = wf["week"]
        msg_fp = DATA / f"messages_week{w:02d}.json"
        dec_fp = DATA / f"decisions_week{w:02d}.json"

        step = tqdm(total=3, desc=f"Week {w:02d}", leave=False, unit="step")

        # Step 1: messages
        try:
            if msg_fp.exists():
                msgs_raw = _load_json(msg_fp)
                step.update(1); step.set_postfix_str(f"generate: cached ({len(msgs_raw) if isinstance(msgs_raw, list) else 0})")
            else:
                msgs = generate_week(intake, wf, plan, kpis, w)
                step.update(1); step.set_postfix_str(f"generate: {len(msgs)}")
                ok, errs = validate_messages([m.model_dump() for m in msgs], wf)
                if not ok:
                    tqdm.write(f"  validator: {errs} → regen once")
                    plan["generator_fixes"] = errs
                    msgs = generate_week(intake, wf, plan, kpis, w)
                    step.set_postfix_str(f"regen: {len(msgs)}")
        except RateLimitError:
            tqdm.write(f"❗ Rate limit during week {w:02d} message gen. Set WEEK_RANGE to resume later.")
            return

        step.update(1)

        # Step 3: decisions
        try:
            if dec_fp.exists():
                decs_raw = _load_json(dec_fp)
                step.update(1); step.set_postfix_str(f"extract: cached ({len(decs_raw) if isinstance(decs_raw, list) else 0})")
            else:
                decs = extract_decisions(w, metrics, labs)
                step.update(1); step.set_postfix_str(f"extract: {len(decs)}")
        except RateLimitError:
            tqdm.write(f"❗ Rate limit during week {w:02d} decisions. Use WEEK_RANGE to continue tomorrow.")
            return

        step.close()
        overall.update(1)

    overall.close()
    tqdm.write("✅ Done. Check data/ for messages_*, decisions_*, metrics.json, labs.json")

if __name__ == "__main__":
    main()
