# src/journey_calendar.py
from datetime import datetime, timedelta, timezone

def build_calendar(start_date: str = "2025-05-01") -> list[dict]:
    """
    Builds 32 weeks with flags:
      - travel_week: True 1 out of every 4 weeks
      - exercise_update_due: True on even weeks
      - labs_due: True on weeks 1, 13, 25 (quarterly full panel)
    """
    tz = timezone(timedelta(hours=8))  # Asia/Singapore (+08:00)
    start = datetime.fromisoformat(start_date).replace(tzinfo=tz)
    weeks = []
    for w in range(1, 33):
        d0 = start + timedelta(weeks=w-1)
        weeks.append({
            "week": w,
            "start": d0.isoformat(),
            "end": (d0 + timedelta(days=6, hours=23, minutes=59)).isoformat(),
            "travel_week": (w % 4 == 0),               # 1 in every 4
            "exercise_update_due": (w % 2 == 0),       # every 2 weeks
            "labs_due": (w in (1, 13, 25)),            # quarterly
            "adherence_target": 0.50
        })
    return weeks
