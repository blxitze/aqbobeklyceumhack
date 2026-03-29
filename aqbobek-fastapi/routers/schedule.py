from fastapi import APIRouter, Depends

from database.connection import get_db
from schemas.schedule import (
    GenerateRequest,
    GenerateResponse,
    ScheduleSlotOut,
    SubstituteRequest,
    SubstituteResponse,
)
from services.scheduler import generate_schedule, handle_substitution
from utils.auth import verify_internal_token


router = APIRouter(dependencies=[Depends(verify_internal_token)])


@router.post("/generate", response_model=GenerateResponse)
def generate(payload: GenerateRequest, db=Depends(get_db)) -> GenerateResponse:
    generate_schedule(class_ids=payload.classIds, date=payload.date, db=db)
    mock_slots = [
        ScheduleSlotOut(
            id="slot-1",
            classId=payload.classIds[0] if payload.classIds else "class-9a",
            teacherId="teacher-1",
            subject="Математика",
            room="204",
            dayOfWeek=1,
            timeSlot=1,
        ),
        ScheduleSlotOut(
            id="slot-2",
            classId=payload.classIds[0] if payload.classIds else "class-9a",
            teacherId="teacher-2",
            subject="Физика",
            room="109",
            dayOfWeek=1,
            timeSlot=2,
        ),
    ]
    return GenerateResponse(schedule=mock_slots, message="Mock one-day schedule generated.")


@router.post("/substitute", response_model=SubstituteResponse)
def substitute(payload: SubstituteRequest, db=Depends(get_db)) -> SubstituteResponse:
    handle_substitution(teacher_id=payload.originalTeacherId, date=payload.date, db=db)
    updated_slots = [
        ScheduleSlotOut(
            id="slot-3",
            classId="class-10b",
            teacherId="teacher-9",
            subject="История",
            room="301",
            dayOfWeek=1,
            timeSlot=3,
        )
    ]
    return SubstituteResponse(
        updatedSlots=updated_slots,
        diff=[
            f"Teacher {payload.originalTeacherId} replaced for {payload.date}",
            "slot-3 teacher changed to teacher-9",
        ],
        message="Mock substitution applied for current day.",
    )
