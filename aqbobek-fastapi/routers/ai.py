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

    highest_risk_subject = risk.get("highestRiskSubject", "")
    subject_risks = risk.get("subjectRisks", [])
    highest_subject_risk = next(
        (sr for sr in subject_risks if sr.get("subject") == highest_risk_subject),
        subject_risks[0] if subject_risks else None,
    )

    # Build graph ONLY for highest-risk subject to avoid cross-subject paths.
    subject_topics_orm = db.query(Topic).filter(Topic.subject == highest_risk_subject).all()
    graph = build_knowledge_graph(subject_topics_orm)

    weak_topics = highest_subject_risk.get("missedTopics", []) if highest_subject_risk else []
    root_problem = find_root_problem(weak_topics, graph)

    learning_path: list[str] = []
    if weak_topics:
        target = weak_topics[0]
        learning_path = get_study_path(root_problem, target, graph)
        # Guard against edge cases where path function falls back.
        if any(topic not in graph for topic in learning_path):
            learning_path = [root_problem]

    typed_subject_risks = [
        SubjectRisk(**sr) for sr in risk["subjectRisks"]
    ]

    return AnalyzeResponse(
        studentId=student_id,
        riskScore=risk["riskScore"],
        riskPercent=risk["riskPercent"],
        riskLevel=risk["riskLevel"],
        highestRiskSubject=highest_risk_subject,
        subjectRisks=typed_subject_risks,
        strengths=risk["strengths"],
        weaknesses=risk["weaknesses"],
        careerHint=risk["careerHint"],
        attendanceWarning=risk["attendanceWarning"],
        rootProblem=root_problem,
        studyPath=learning_path,
    )


@router.post("/tutor-text", response_model=TutorTextResponse)
async def get_tutor_text(
    request: TutorTextRequest,
    _: None = Depends(verify_internal_token),
):
    a = request.analyzeResult
    worst = a.subjectRisks[0] if a.subjectRisks else None
    risk_percent = int(a.riskPercent)
    risk_level = a.riskLevel
    highest_risk_subject = a.highestRiskSubject or (worst.subject if worst else "неизвестный предмет")
    root_topic = a.rootProblem or "Нет проблемных тем"
    learning_path = a.studyPath or ([root_topic] if root_topic else [])

    api_key = os.getenv("OPENAI_API_KEY", "")

    if not api_key:
        path_str = " -> ".join(learning_path) if learning_path else root_topic
        grade_info = ""
        if worst:
            grade_info = (
                f"Твой итоговый процент по {highest_risk_subject}: "
                f"{worst.finalPercent}% "
                f"(ФО: {worst.foPercent}%, "
                f"СОР: {worst.sorPercent}%, "
                f"СОЧ: {worst.socPercent}%). "
                f"Прогнозируемая оценка: {worst.predictedGrade}. "
            )
        text = (
            f"Риск по предмету {highest_risk_subject}: {risk_percent}% ({risk_level}). "
            f"{grade_info}"
            f"Корень проблемы - тема «{root_topic}». "
            f"Изучи в порядке: {path_str}. "
            f"{a.careerHint}."
        )
        return TutorTextResponse(text=text)

    client = OpenAI(api_key=api_key)

    clean_context = {
        "risk_percent": risk_percent,
        "risk_level": risk_level,
        "highest_risk_subject": highest_risk_subject,
        "root_topic": root_topic,
        "learning_path": learning_path,
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
                    f"Данные алгоритмического анализа: {clean_context}\n\n"
                    "Напиши совет ученику (3-4 предложения):\n"
                    "1. Конкретный риск с % вероятности\n"
                    "2. Корневая тема-проблема\n"
                    "3. Что изучить в первую очередь\n"
                    "4. Мотивация на основе сильных предметов\n"
                    "НЕ придумывай цифры - используй только данные выше. "
                    "Используй risk_percent как единственный источник процента риска."
                ),
            },
        ],
        max_tokens=350,
    )

    return TutorTextResponse(
        text=response.choices[0].message.content or "Ошибка генерации"
    )
