import os

from fastapi import APIRouter, Depends
from openai import OpenAI

from database.connection import get_db
from schemas.ai import AnalyzeResponse, SubjectRisk, TutorTextRequest, TutorTextResponse
from services.analytics import compute_risk
from services.knowledge_graph import find_root_problem
from utils.auth import verify_internal_token


router = APIRouter(dependencies=[Depends(verify_internal_token)])


@router.post("/analyze/{student_id}", response_model=AnalyzeResponse)
def analyze_student(student_id: str, db=Depends(get_db)) -> AnalyzeResponse:
    # Stub flow: grades from DB + analytics and graph service calls.
    grades: list[dict] = []
    compute_risk(grades=grades, student_id=student_id)
    find_root_problem(weak_topics=["Квадратные уравнения"], graph=None)

    return AnalyzeResponse(
        studentId=student_id,
        riskLevel="medium",
        subjectRisks=[
            SubjectRisk(
                subject="Математика",
                averageScore=62.5,
                trend="down",
                missedTopics=["Квадратные уравнения", "Системы уравнений"],
                riskScore=0.68,
            ),
            SubjectRisk(
                subject="Физика",
                averageScore=71.0,
                trend="stable",
                missedTopics=["Законы Ньютона"],
                riskScore=0.49,
            ),
        ],
        strengths=["Информатика", "История"],
        weaknesses=["Математика", "Физика"],
        careerHint="Рекомендуется усилить математику для инженерных направлений.",
        attendanceWarning="3 пропуска за последние 2 недели могут повлиять на итоговые результаты.",
    )


@router.post("/tutor-text", response_model=TutorTextResponse)
def tutor_text(payload: TutorTextRequest) -> TutorTextResponse:
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key:
        return TutorTextResponse(
            text=(
                "Твой прогресс хороший, но по математике видна просадка. "
                "Сфокусируйся на темах 'Квадратные уравнения' и 'Системы уравнений' "
                "в ближайшие 7 дней, чтобы снизить риск и улучшить итог."
            )
        )

    client = OpenAI(api_key=api_key)
    completion = client.responses.create(
        model="gpt-4o-mini",
        input=(
            "Ты школьный тьютор. Используй только входные данные, не меняй числа.\n"
            f"JSON: {payload.model_dump_json()}"
        ),
    )
    text = completion.output_text or "Рекомендации подготовлены."
    return TutorTextResponse(text=text)
