import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler


def compute_kazakh_percent(grades: list[dict]) -> dict:
    fo = [g for g in grades if g.get("type") == "CURRENT"]
    sor = [g for g in grades if g.get("type") == "SOR"]
    soc = [g for g in grades if g.get("type") == "SOC"]

    fo_pct = (
        sum(g["score"] for g in fo) / sum(g.get("max_score", 10) for g in fo) * 100
    ) if fo else None

    sor_pct = (
        sum(g["score"] for g in sor) / sum(g.get("max_score", 20) for g in sor) * 100
    ) if sor else None

    soc_pct = (
        sum(g["score"] for g in soc) / sum(g.get("max_score", 25) for g in soc) * 100
    ) if soc else None

    final = None
    if fo_pct is not None and sor_pct is not None and soc_pct is not None:
        final = fo_pct * 0.25 + sor_pct * 0.25 + soc_pct * 0.50

    grade = None
    if final is not None:
        grade = 5 if final >= 85 else 4 if final >= 65 else 3 if final >= 40 else 2

    return {
        "fo_pct": round(fo_pct, 1) if fo_pct is not None else None,
        "sor_pct": round(sor_pct, 1) if sor_pct is not None else None,
        "soc_pct": round(soc_pct, 1) if soc_pct is not None else None,
        "final_pct": round(final, 1) if final is not None else None,
        "predicted_grade": grade,
    }


def compute_trend(percents: list[float]) -> str:
    if len(percents) < 4:
        return "stable"
    mid = len(percents) // 2
    first_half = np.mean(percents[:mid])
    second_half = np.mean(percents[mid:])
    diff = second_half - first_half
    if diff > 5:
        return "improving"
    if diff < -5:
        return "declining"
    return "stable"


def train_logistic_regression(
    fo_pct: float,
    sor_pct: float,
    soc_pct: float,
    final_pct: float,
    attendance_rate: float,
) -> dict:
    """
    Logistic Regression predicts probability of failing SOC (grade 2).

    Synthetic training data generated around realistic school distributions.
    Student's features are evaluated against this distribution.

    Features: [fo_pct, sor_pct, soc_pct, final_pct, attendance_rate]
    Label: 1 if final_pct < 40 (failing), 0 otherwise
    """
    np.random.seed(42)
    n = 200

    fo_train = np.clip(np.random.normal(65, 18, n), 0, 100)
    sor_train = np.clip(np.random.normal(62, 20, n), 0, 100)
    soc_train = np.clip(np.random.normal(60, 22, n), 0, 100)
    att_train = np.clip(np.random.normal(85, 12, n), 0, 100)
    final_train = fo_train * 0.25 + sor_train * 0.25 + soc_train * 0.50

    x_train = np.column_stack([
        fo_train, sor_train, soc_train, final_train, att_train
    ])
    y_train = ((final_train < 40) | (soc_train < 35)).astype(int)

    if len(np.unique(y_train)) < 2:
        y_train[0] = 1

    scaler = StandardScaler()
    x_scaled = scaler.fit_transform(x_train)

    model = LogisticRegression(random_state=42, max_iter=200)
    model.fit(x_scaled, y_train)

    student = np.array([[fo_pct, sor_pct, soc_pct, final_pct, attendance_rate]])
    student_scaled = scaler.transform(student)
    prob = float(model.predict_proba(student_scaled)[0][1])

    return {
        "failure_probability": round(prob, 3),
        "confidence": "high" if final_pct is not None else "low",
        "feature_weights": {
            "fo": round(abs(float(model.coef_[0][0])), 3),
            "sor": round(abs(float(model.coef_[0][1])), 3),
            "soc": round(abs(float(model.coef_[0][2])), 3),
            "final": round(abs(float(model.coef_[0][3])), 3),
            "attendance": round(abs(float(model.coef_[0][4])), 3),
        },
    }


def compute_risk(grades: list[dict], student_id: str) -> dict:
    """
    Main analytics. grades is list of dicts:
    { subject, topic, score, max_score, type, attendance, date }
    """
    if not grades:
        return {
            "studentId": student_id,
            "riskLevel": "low",
            "subjectRisks": [],
            "strengths": [],
            "weaknesses": [],
            "careerHint": "Недостаточно данных",
            "attendanceWarning": False,
        }

    by_subject: dict[str, list[dict]] = {}
    for g in grades:
        s = g["subject"]
        by_subject.setdefault(s, []).append(g)

    subject_risks = []
    strengths = []
    weaknesses = []
    all_attendance = [g["attendance"] for g in grades]
    overall_attendance = (
        sum(all_attendance) / len(all_attendance) * 100 if all_attendance else 100.0
    )

    for subject, sg in by_subject.items():
        kaz = compute_kazakh_percent(sg)
        fo_pct = kaz["fo_pct"] or 50.0
        sor_pct = kaz["sor_pct"] or 50.0
        soc_pct = kaz["soc_pct"] or 50.0
        final_pct = kaz["final_pct"] or (fo_pct * 0.25 + sor_pct * 0.25 + soc_pct * 0.50)

        fo_grades = sorted(
            [g for g in sg if g.get("type") == "CURRENT"],
            key=lambda x: x.get("date", ""),
        )
        fo_percents = [g["score"] / g.get("max_score", 10) * 100 for g in fo_grades]
        trend = compute_trend(fo_percents)

        missed_topics = list(set([
            g["topic"] for g in sg if g["score"] / g.get("max_score", 10) < 0.5
        ]))

        lr = train_logistic_regression(
            fo_pct, sor_pct, soc_pct, final_pct, overall_attendance
        )

        rule_risk = (100 - final_pct) * 0.7 + len(missed_topics) * 3
        if soc_pct < 40:
            rule_risk += 25
        if sor_pct < 40:
            rule_risk += 10
        lr_risk = lr["failure_probability"] * 100
        risk_score = round(min(rule_risk * 0.6 + lr_risk * 0.4, 100), 1)

        subject_risks.append({
            "subject": subject,
            "foPercent": kaz["fo_pct"],
            "sorPercent": kaz["sor_pct"],
            "socPercent": kaz["soc_pct"],
            "finalPercent": kaz["final_pct"],
            "predictedGrade": kaz["predicted_grade"],
            "trend": trend,
            "missedTopics": missed_topics,
            "riskScore": risk_score,
            "failureProbability": lr["failure_probability"],
            "confidence": lr["confidence"],
        })

        if final_pct is not None and final_pct >= 65:
            strengths.append(subject)
        if final_pct is not None and final_pct < 40:
            weaknesses.append(subject)

    overall_finals = [sr["finalPercent"] for sr in subject_risks if sr["finalPercent"] is not None]
    overall_avg = np.mean(overall_finals) if overall_finals else 50.0
    failing_count = sum(1 for f in overall_finals if f < 40)

    if failing_count >= 2 or overall_avg < 40:
        risk_level = "high"
    elif failing_count >= 1 or overall_avg < 65:
        risk_level = "medium"
    else:
        risk_level = "low"

    career_map = {
        "Математика": "IT, инженерия, финансы",
        "Информатика": "разработка, Data Science, AI",
        "Физика": "инженерия, физика, робототехника",
        "Биология": "медицина, биотехнологии",
        "История": "право, журналистика, дипломатия",
    }
    career_hint = "Продолжай развиваться во всех направлениях"
    if strengths:
        top = strengths[0]
        hint = career_map.get(top, "")
        if hint:
            career_hint = (
                f"По сильным предметам ({', '.join(strengths)}) "
                f"рекомендуем: {hint}"
            )

    subject_risks.sort(key=lambda x: x["riskScore"], reverse=True)

    return {
        "studentId": student_id,
        "riskLevel": risk_level,
        "subjectRisks": subject_risks,
        "strengths": strengths,
        "weaknesses": weaknesses,
        "careerHint": career_hint,
        "attendanceWarning": overall_attendance < 80,
    }
