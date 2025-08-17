# src/push_to_firestore.py
import os, re, glob, json
from pathlib import Path
from dotenv import load_dotenv
from google.cloud import firestore
from google.oauth2 import service_account

load_dotenv()

DATA = Path("data")
PROJECT_ID   = os.getenv("FIREBASE_PROJECT_ID")
USERS_COL    = os.getenv("FIREBASE_USERS_COLLECTION", "users")
SA_PATH_RAW  = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "")  # can contain spaces

# ---------------- helpers ----------------

def _load_json(p: Path, default=None):
    try:
        return json.loads(p.read_text())
    except Exception:
        return default

def _as_map(value, field_name="data"):
    """Firestore requires a top-level object; wrap non-dicts."""
    if isinstance(value, dict):
        return value
    return {field_name: value}

def _client() -> firestore.Client:
    """Create Firestore client using explicit service-account (handles spaces)."""
    if not PROJECT_ID:
        raise RuntimeError("FIREBASE_PROJECT_ID missing in .env")
    sa_path = os.path.expanduser(os.path.expandvars(SA_PATH_RAW or ""))
    if not sa_path or not os.path.isfile(sa_path):
        raise RuntimeError(
            "Service account JSON not found.\n"
            f"GOOGLE_APPLICATION_CREDENTIALS currently: {SA_PATH_RAW!r}\n"
            "If the path has spaces, wrap it in quotes in your .env, e.g.\n"
            'GOOGLE_APPLICATION_CREDENTIALS="/Users/you/Documents/Elyx Hackathon/secrets/firebase-sa.json"'
        )
    creds = service_account.Credentials.from_service_account_file(sa_path)
    return firestore.Client(project=PROJECT_ID, credentials=creds)

def _week_from_name(name: str) -> int:
    m = re.search(r"week(\d+)", name)
    return int(m.group(1)) if m else 0

def _wipe_subcollection(db: firestore.Client, doc_ref: firestore.DocumentReference, sub: str, batch_size: int = 500):
    """Delete all docs under users/<id>/<sub>/* safely."""
    while True:
        docs = list(doc_ref.collection(sub).limit(batch_size).stream())
        if not docs:
            break
        batch = db.batch()
        for d in docs:
            batch.delete(d.reference)
        batch.commit()

def build_bundle(member_id: str):
    bundle_fp = DATA / "chat_bundle.json"
    if bundle_fp.exists():
        b = json.loads(bundle_fp.read_text())
        b["memberId"] = member_id
        return b

    out = {
        "memberId": member_id,
        "calendar": _load_json(DATA / "journey_calendar.json", []),
        "metrics":  _load_json(DATA / "metrics.json", {}),
        "labs":     _load_json(DATA / "labs.json", {}),
        "weeks":    []
    }
    for fp in sorted(glob.glob(str(DATA / "messages_week*.json"))):
        w = int(Path(fp).stem.replace("messages_week", ""))
        msgs = _load_json(Path(fp), [])
        dec_fp = DATA / f"decisions_week{w:02d}.json"
        decs = _load_json(dec_fp, [])
        out["weeks"].append({"week": w, "messages": msgs, "decisions": decs})
    return out

# ---------------- main push ----------------

def push_to_firestore(member_id="rohan"):
    db = _client()
    user_ref = db.collection(USERS_COL).document(member_id)

    # Create/merge root doc
    user_ref.set({"memberId": member_id, "hasChat": True}, merge=True)

    # Wipe old content so new chats fully replace
    _wipe_subcollection(db, user_ref, "weeks")
    _wipe_subcollection(db, user_ref, "meta")

    bundle = build_bundle(member_id)

    # Meta docs (wrapped as maps)
    meta_ref = user_ref.collection("meta")
    meta_ref.document("metrics").set(_as_map(bundle.get("metrics", {}), field_name="series"))
    meta_ref.document("labs").set(_as_map(bundle.get("labs", {}), field_name="series"))

    # Weeks: one doc per week containing arrays
    total_msgs = 0
    total_decs = 0
    for w in bundle["weeks"]:
        msgs = w.get("messages", []) or []
        decs = w.get("decisions", []) or []
        total_msgs += len(msgs)
        total_decs += len(decs)

        user_ref.collection("weeks").document(f"{w['week']:02d}").set({
            "week": w["week"],
            "messages": msgs,
            "decisions": decs
        })

    # Counters (handy for UI)
    user_ref.set({
        "counters": {"messages": total_msgs, "decisions": total_decs}
    }, merge=True)

    print(f"✅ Firestore updated for member: {member_id} ({total_msgs} msgs, {total_decs} decisions)")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Push chats/decisions/meta to Firestore for a user.")
    parser.add_argument("--user", "-u", default="rohan", help="User doc id under the users collection")
    args = parser.parse_args()
    push_to_firestore(args.user)
