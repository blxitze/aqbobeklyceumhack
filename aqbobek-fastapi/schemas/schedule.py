from pydantic import BaseModel


class GenerateRequest(BaseModel):
    classIds: list[str]
    date: str


class ScheduleSlotOut(BaseModel):
    id: str
    classId: str
    teacherId: str
    subject: str
    room: str
    dayOfWeek: int
    timeSlot: int


class GenerateResponse(BaseModel):
    schedule: list[ScheduleSlotOut]
    message: str


class SubstituteRequest(BaseModel):
    originalTeacherId: str
    date: str
    reason: str


class SubstituteResponse(BaseModel):
    updatedSlots: list[ScheduleSlotOut]
    diff: list[str]
    message: str
