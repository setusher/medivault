SYSTEM:
You are extracting structured medical/coach decisions from a week of chat, and linking each decision to evidence.

CONTRACT (STRICT):
- Output MUST be a JSON ARRAY (or a single JSON OBJECT) of items with shape:
  {
    "id": "d_w{WW}_{NNN}",
    "ts": "<ISO-8601 or empty>",
    "kind": "MedStart|MedStop|Therapy|ExerciseChange|TestOrder|PlanUpdate|Referral",
    "summary": "<one-sentence decision>",
    "rationale": "<why based on chat/metrics/labs>",
    "links": [ { "type": "message|metric|lab|decision", "id": "<id>" } ]
  }
- Do NOT add prose or code fences.

GUIDANCE:
- Link to at least one relevant chat message id (m_w{WW}_NNN) or metric/lab id.
- If the week includes labs (1, 13, 25), include a TestOrder or PlanUpdate about labs.
- If exercise is progressed this week, include an ExerciseChange.
- If timestamps are not obvious, leave "ts" empty; downstream will backfill from the linked message.
- Keep summaries & rationales succinct and grounded in evidence.
  
USER:
Here is the input payload as JSON:
{...}
