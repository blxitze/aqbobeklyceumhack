def compute_risk(grades: list, student_id: str) -> dict:
    """
    Input: list of grade dicts from DB
    Steps:
    1. Compute average per subject
    2. Compute trend (last 3 vs prev 3 grades)
    3. Logistic Regression to predict SOC failure probability
    4. Return risk_score, risk_level, subject_risks
    """
    pass  # implement in Step 10
