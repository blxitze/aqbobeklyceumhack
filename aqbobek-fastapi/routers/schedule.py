from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

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

router = APIRouter()


@router.post("/generate", response_model=GenerateResponse)
async def schedule_generate(
    req: GenerateRequest,
    db: Session = Depends(get_db),
    _: None = Depends(verify_internal_token),
):
    result = generate_schedule(req.classIds, req.date, db)
    return GenerateResponse(
        schedule=[ScheduleSlotOut(**s) for s in result["schedule"]],
        message=result["message"],
        conflicts=result.get("conflicts", []),
    )


@router.post("/substitute", response_model=SubstituteResponse)
async def schedule_substitute(
    req: SubstituteRequest,
    db: Session = Depends(get_db),
    _: None = Depends(verify_internal_token),
):
    result = handle_substitution(req.originalTeacherId, req.date, req.reason, db)
    return SubstituteResponse(**result)
