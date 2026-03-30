from collections import defaultdict
from datetime import datetime

import numpy as np
from sklearn.linear_model import LogisticRegression


def _average(grades: list[dict]) -> float:
    if not grades:
        return 0.0
    return round(sum(float(item.get("score", 0)) for item in grades) / len(grades), 1)


def _trend(grades: list[dict]) -> str:
    if len(grades) < 6:
        return "stable"

    def parse_date(value: object) -> datetime:
        if isinstance(value, datetime):
            return value
        try:
            return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        except ValueError:
            return datetime.min

    ordered = sorted(grades, key=lambda item: parse_date(item.get("date")))
    recent_six = ordered[-6:]
    first_three = recent_six[:3]
    last_three = recent_six[3:]
    diff = _average(last_three) - _average(first_three)
    if diff > 5:
        return "improving"
    if diff < -5:
        return "declining"
    return "stable"


def _round_or_none(value: float | None) -> float | None:
    if value is None:
        return None
    return round(value, 1)


def compute_kazakh_percent(grades: list[dict]) -> dict:
    fo = [grade for grade in grades if str(grade.get("type", "CURRENT")) == "CURRENT"]
    sor = [grade for grade in grades if str(grade.get("type", "CURRENT")) == "SOR"]
    soc = [grade for grade in grades if str(grade.get("type", "CURRENT")) == "SOC"]

    fo_pct = (
        sum(float(grade.get("score", 0)) for grade in fo)
        / sum(float(grade.get("maxScore", 10)) for grade in fo)
        * 100
        if fo and sum(float(grade.get("maxScore", 10)) for grade in fo) > 0
        else None
    )
    sor_pct = (
        sum(float(grade.get("score", 0)) for grade in sor)
        / sum(float(grade.get("maxScore", 20)) for grade in sor)
        * 100
        if sor and sum(float(grade.get("maxScore", 20)) for grade in sor) > 0
        else None
    )
    soc_pct = (
        sum(float(grade.get("score", 0)) for grade in soc)
        / sum(float(grade.get("maxScore", 25)) for grade in soc)
        * 100
        if soc and sum(float(grade.get("maxScore", 25)) for grade in soc) > 0
        else None
    )

    final = None
    if fo_pct is not None and sor_pct is not None and soc_pct is not None:
        final = fo_pct * 0.25 + sor_pct * 0.25 + soc_pct * 0.50

    grade = None
    if final is not None:
        if final >= 85:
            grade = 5
        elif final >= 65:
            grade = 4
        elif final >= 40:
            grade = 3
        else:
            grade = 2

    return {
        "fo_percent": _round_or_none(fo_pct),
        "sor_percent": _round_or_none(sor_pct),
        "soc_percent": _round_or_none(soc_pct),
        "final_percent": _round_or_none(final),
        "predicted_grade": grade,
    }


def compute_risk(grades: list, student_id: str) -> dict:
    safe_grades = [item for item in grades if isinstance(item, dict)]
    if not safe_grades:
        return {
            "student_id": student_id,
            "risk_score": 0.0,
            "risk_level": "medium",
            "lr_probability": 0.0,
            "subject_risks": [],
            "features": {"fo_pct": None, "sor_pct": None, "soc_pct": None},
        }

    by_subject: dict[str, list[dict]] = defaultdict(list)
    for grade in safe_grades:
        by_subject[str(grade.get("subject", "Unknown"))].append(grade)

    subject_risks = []
    for subject, subject_grades in by_subject.items():
        kz = compute_kazakh_percent(subject_grades)
        base_score = 70.0 if kz["final_percent"] is None else 100.0 - float(kz["final_percent"])
        if kz["soc_percent"] is not None and float(kz["soc_percent"]) < 40:
            base_score += 25
        if kz["sor_percent"] is not None and float(kz["sor_percent"]) < 40:
            base_score += 10

        subject_risks.append(
            {
                "subject": subject,
                "fo_percent": kz["fo_percent"],
                "sor_percent": kz["sor_percent"],
                "soc_percent": kz["soc_percent"],
                "final_percent": kz["final_percent"],
                "predicted_grade": kz["predicted_grade"],
                "trend": _trend(subject_grades),
                "risk_score": round(max(0.0, min(100.0, base_score)), 1),
            }
        )

    overall = compute_kazakh_percent(safe_grades)
    fo_feature = float(overall["fo_percent"] if overall["fo_percent"] is not None else 50.0)
    sor_feature = float(overall["sor_percent"] if overall["sor_percent"] is not None else 50.0)
    soc_feature = float(overall["soc_percent"] if overall["soc_percent"] is not None else 50.0)

    # Deterministic LogisticRegression baseline with FO/SOR/SOC features.
    x_train = np.array(
        [
            [92, 89, 91],
            [86, 80, 83],
            [74, 69, 65],
            [62, 57, 52],
            [49, 45, 38],
            [35, 33, 30],
            [78, 74, 70],
            [58, 50, 42],
        ],
        dtype=float,
    )
    y_train = np.array([0, 0, 0, 1, 1, 1, 0, 1], dtype=int)
    lr_model = LogisticRegression(random_state=42, max_iter=400)
    lr_model.fit(x_train, y_train)

    features = np.array([[fo_feature, sor_feature, soc_feature]], dtype=float)
    lr_probability = float(lr_model.predict_proba(features)[0][1])
    risk_score = lr_probability * 100
    if overall["soc_percent"] is not None and float(overall["soc_percent"]) < 40:
        risk_score += 25
    if overall["sor_percent"] is not None and float(overall["sor_percent"]) < 40:
        risk_score += 10
    risk_score = round(max(0.0, min(100.0, risk_score)), 1)

    if (
        (overall["final_percent"] is not None and float(overall["final_percent"]) < 40)
        or (overall["soc_percent"] is not None and float(overall["soc_percent"]) < 40)
    ):
        risk_level = "high"
    elif overall["final_percent"] is not None and float(overall["final_percent"]) < 65:
        risk_level = "medium"
    elif overall["final_percent"] is None:
        risk_level = "medium"
    else:
        risk_level = "low"

    return {
        "student_id": student_id,
        "risk_score": risk_score,
        "risk_level": risk_level,
        "lr_probability": round(lr_probability, 4),
        "subject_risks": subject_risks,
        "features": {
            "fo_pct": overall["fo_percent"],
            "sor_pct": overall["sor_percent"],
            "soc_pct": overall["soc_percent"],
            "final_percent": overall["final_percent"],
            "predicted_grade": overall["predicted_grade"],
        },
    }
