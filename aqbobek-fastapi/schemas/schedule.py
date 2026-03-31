from typing import Optional

from pydantic import BaseModel


class GenerateRequest(BaseModel):
    classIds: list[str]
    date: str


class ScheduleSlotOut(BaseModel):
    id: str = ""
    classId: str
    className: str = ""
    subject: str
    teacherId: str = ""
    room: str
    dayOfWeek: int
    timeSlot: int


class GenerateResponse(BaseModel):
    schedule: list[ScheduleSlotOut]
    message: str
    conflicts: list[str] = []


class SubstituteRequest(BaseModel):
    originalTeacherId: str
    date: str
    reason: str = "Не указана"


class SubstituteResponse(BaseModel):
    updatedSlots: list[dict]
    diff: list[str]
    message: str
    substituteTeacherId: Optional[str] = None
