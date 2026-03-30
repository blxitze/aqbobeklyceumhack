import os

from fastapi import APIRouter, Depends, HTTPException
from openai import OpenAI
from sqlalchemy.orm import Session

from database.connection import get_db
from database.models import Grade, StudentProfile, Topic
from schemas.ai import AnalyzeResponse, SubjectRisk, TutorTextRequest, TutorTextResponse
from services.analytics import compute_risk
from services.knowledge_graph import build_knowledge_graph, find_root_problem, get_study_path
from utils.auth import verify_internal_token


router = APIRouter()


@router.post("/analyze/{student_id}", response_model=AnalyzeResponse)
async def analyze_student(
    student_id: str,
    db: Session = Depends(get_db),
    _: None = Depends(verify_internal_token),
):
    grades_orm = db.query(Grade).filter(
        Grade.student_id == student_id
    ).order_by(Grade.date).all()

    if not grades_orm:
        raise HTTPException(404, detail="Grades not found for student")

    grades = [{
        "subject": g.subject,
        "topic": g.topic,
        "score": float(g.score),
        "max_score": float(g.max_score) if g.max_score else 10.0,
        "type": g.type,
        "attendance": bool(g.attendance),
        "date": str(g.date),
    } for g in grades_orm]

    risk = compute_risk(grades, student_id)

    topics_orm = db.query(Topic).all()
    graph = build_knowledge_graph(topics_orm)

    all_weak = []
    for sr in risk["subjectRisks"]:
        all_weak.extend(sr.get("missedTopics", []))

    root_problem = find_root_problem(all_weak, graph)

    study_path: list[str] = []
    if risk["subjectRisks"] and all_weak:
        worst_subject = risk["subjectRisks"][0]
        if worst_subject.get("missedTopics"):
            target = worst_subject["missedTopics"][0]
            study_path = get_study_path(root_problem, target, graph)

    subject_risks = [
        SubjectRisk(**sr) for sr in risk["subjectRisks"]
    ]

    return AnalyzeResponse(
        studentId=student_id,
        riskLevel=risk["riskLevel"],
        subjectRisks=subject_risks,
        strengths=risk["strengths"],
        weaknesses=risk["weaknesses"],
        careerHint=risk["careerHint"],
        attendanceWarning=risk["attendanceWarning"],
        rootProblem=root_problem,
        studyPath=study_path,
    )


@router.post("/tutor-text", response_model=TutorTextResponse)
async def get_tutor_text(
    request: TutorTextRequest,
    _: None = Depends(verify_internal_token),
):
    a = request.analyzeResult
    worst = a.subjectRisks[0] if a.subjectRisks else None
    prob_pct = round((worst.failureProbability if worst else 0.3) * 100)
    worst_subject = worst.subject if worst else "неизвестный предмет"

    api_key = os.getenv("OPENAI_API_KEY", "")

    if not api_key:
        path_str = " -> ".join(a.studyPath) if a.studyPath else a.rootProblem
        grade_info = ""
        if worst:
            grade_info = (
                f"Твой итоговый процент по {worst_subject}: "
                f"{worst.finalPercent}% "
                f"(ФО: {worst.foPercent}%, "
                f"СОР: {worst.sorPercent}%, "
                f"СОЧ: {worst.socPercent}%). "
                f"Прогнозируемая оценка: {worst.predictedGrade}. "
            )
        text = (
            f"С вероятностью {prob_pct}% ты можешь получить 2 "
            f"на следующем СОЧ по {worst_subject}. "
            f"{grade_info}"
            f"Корень проблемы - тема «{a.rootProblem}». "
            f"Изучи в порядке: {path_str}. "
            f"{a.careerHint}."
        )
        return TutorTextResponse(text=text)

    client = OpenAI(api_key=api_key)

    context = {
        "riskLevel": a.riskLevel,
        "worstSubject": worst_subject,
        "failureProbabilityPercent": prob_pct,
        "rootProblem": a.rootProblem,
        "studyPath": a.studyPath,
        "strengths": a.strengths,
        "careerHint": a.careerHint,
        "subjectSummary": [
            {
                "subject": sr.subject,
                "finalPercent": sr.finalPercent,
                "predictedGrade": sr.predictedGrade,
                "foPercent": sr.foPercent,
                "sorPercent": sr.sorPercent,
                "socPercent": sr.socPercent,
            }
            for sr in a.subjectRisks[:3]
        ],
    }

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": (
                    "Ты персональный AI-наставник ученика "
                    "казахстанской школы. Пиши по-русски, "
                    "дружелюбно, конкретно. "
                    "Итоговая оценка = ФО(25%) + СОР(25%) + СОЧ(50%)."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Данные алгоритмического анализа: {context}\n\n"
                    "Напиши совет ученику (3-4 предложения):\n"
                    "1. Конкретный риск с % вероятности\n"
                    "2. Корневая тема-проблема\n"
                    "3. Что изучить в первую очередь\n"
                    "4. Мотивация на основе сильных предметов\n"
                    "НЕ придумывай цифры - используй только данные выше."
                ),
            },
        ],
        max_tokens=350,
    )

    return TutorTextResponse(
        text=response.choices[0].message.content or "Ошибка генерации"
    )
