from __future__ import annotations
from typing import List, Literal
from pydantic import BaseModel, Field, TypeAdapter

Sender = Literal["Member","Ruby","DrWarren","Advik","Carla","Rachel","Neel"]
LinkType = Literal["message","metric","lab","decision"]
DecisionKind = Literal["MedStart","MedStop","Therapy","ExerciseChange","TestOrder","PlanUpdate","Referral"]

class Link(BaseModel):
    type: LinkType
    id: str

class Message(BaseModel):
    id: str
    ts: str
    sender: Sender
    text: str
    tags: List[str] = Field(default_factory=list)
    links: List[Link] = Field(default_factory=list)

class Decision(BaseModel):
    id: str
    ts: str
    kind: DecisionKind
    summary: str
    rationale: str
    links: List[Link] = Field(default_factory=list)

# Adapters for v2 validate_python / validate_json
MessageList = TypeAdapter(List[Message])
DecisionList = TypeAdapter(List[Decision])
