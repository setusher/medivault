import json
from datetime import datetime, timedelta
from pathlib import Path

DATA = Path("data")

def synth_metrics(start_iso: str, weeks: int = 32):
    start = datetime.fromisoformat(start_iso)
    metrics=[]
    for d in range(weeks*7):
        day = start + timedelta(days=d)
        metrics.append({
            "id": f"metric_{day.strftime('%Y%m%d')}",
            "date": day.date().isoformat(),
            "HRV": 45 + (d % 5) - 2,
            "RHR": 60 + ((-1)**d),
            "Sleep": 6.5 + (d % 3) * 0.25
        })
    (DATA/"metrics.json").write_text(json.dumps(metrics, indent=2))
    return metrics

def synth_labs(start_iso: str):
    start = datetime.fromisoformat(start_iso)
    labs=[]
    for w in (1,13,25):
        dt = start + timedelta(weeks=w-1, days=2)
        labs.append({
            "id": f"lab_w{w:02d}",
            "date": dt.date().isoformat(),
            "A1C": 5.8 + (0.1 if w>1 else 0.0),
            "LDL": 120 - (5 if w>1 else 0),
            "HDL": 45 + (2 if w>1 else 0)
        })
    (DATA/"labs.json").write_text(json.dumps(labs, indent=2))
    return labs
