import os

from fastapi import APIRouter, Depends
from openai import OpenAI

from schemas.ai import TutorTextRequest, TutorTextResponse
from utils.auth import verify_internal_token


router = APIRouter()


@router.post("/tutor-text", response_model=TutorTextResponse)
async def get_tutor_text(
    request: TutorTextRequest,
    _: None = Depends(verify_internal_token),
):
    subject_risks = request.subject_risks or []
    clean_subjects = [
        {**s, "riskScore": round(float(s["riskScore"]))}
        for s in subject_risks
    ]
    highest = max(
        subject_risks,
        key=lambda sr: float(sr.get("riskScore", 0.0)),
        default=None,
    )
    risk_percent = round(float(highest.get("riskScore", 0.0))) if highest else 0
    if risk_percent < 35:
        risk_level = "low"
    elif risk_percent < 65:
        risk_level = "medium"
    else:
        risk_level = "high"

    highest_risk_subject = highest.get("subject", "неизвестный предмет") if highest else "неизвестный предмет"
    root_topic = request.root_topic or "Нет проблемных тем"
    learning_path = request.learning_path or ([root_topic] if root_topic else [])
    weak_subjects = [
        sr for sr in subject_risks
        if sr.get("finalPercent") is not None and float(sr.get("finalPercent")) < 60
    ]

    api_key = os.getenv("OPENAI_API_KEY", "")

    if not api_key:
        path_str = " -> ".join(learning_path) if learning_path else root_topic
        weak_actions = []
        for sr in weak_subjects:
            weak_actions.append(
                f"{sr.get('subject')}: подними итог до 60% через 2 практики по слабым темам"
            )
        weak_text = "; ".join(weak_actions) if weak_actions else "Слабых предметов ниже 60% нет"
        text = (
            f"Высокий риск в предмете {highest_risk_subject}: {risk_percent}% ({risk_level}). "
            f"Начни с темы «{root_topic}», потому что это корень пробелов по цепочке предпосылок: {path_str}. "
            f"Действия по предметам ниже 60%: {weak_text}. "
            "План на неделю: 3 учебные сессии по 45 минут (пн/ср/пт), "
            "в начале каждой сессии 15 минут повторения предыдущей темы, "
            "в конце — 10 заданий на закрепление и мини-проверка в воскресенье."
        )
        return TutorTextResponse(text=text)

    client = OpenAI(api_key=api_key)

    clean_context = {
        "risk_percent": risk_percent,
        "risk_level": risk_level,
        "highest_risk_subject": highest_risk_subject,
        "root_topic": root_topic,
        "learning_path": learning_path,
        "subject_risks": clean_subjects,
        "subjects_below_60": [
            {"subject": sr.get("subject"), "finalPercent": sr.get("finalPercent")}
            for sr in weak_subjects
        ],
    }

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a personal academic tutor for a Kazakh school student."
                ),
            },
            {
                "role": "user",
                "content": (
                    "Student's full academic picture:\n"
                    f"{clean_subjects}\n\n"
                    f"Highest risk: {clean_context['highest_risk_subject']} "
                    f"at {clean_context['risk_percent']}%\n"
                    f"Root problem topic: {clean_context['root_topic']}\n"
                    f"Recommended study path: {clean_context['learning_path']}\n\n"
                    "Write a specific, actionable advice in Russian:\n"
                    "1. Name the exact topic to study first and why (prerequisite chain)\n"
                    "2. For each subject below 60% — give one concrete action\n"
                    "3. End with a realistic weekly study plan (3-4 sentences)\n\n"
                    "Do NOT give generic motivation. Be specific and data-driven.\n"
                    "Keep response under 150 words."
                ),
            },
        ],
        max_tokens=350,
    )

    return TutorTextResponse(
        text=response.choices[0].message.content or "Ошибка генерации"
    )
