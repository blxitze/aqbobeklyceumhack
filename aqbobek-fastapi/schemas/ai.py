from pydantic import BaseModel
from typing import Optional


class SubjectRisk(BaseModel):
    subject: str
    foPercent: Optional[float] = None
    sorPercent: Optional[float] = None
    socPercent: Optional[float] = None
    finalPercent: Optional[float] = None
    predictedGrade: Optional[int] = None
    trend: str = "stable"
    missedTopics: list[str] = []
    riskScore: float = 0.0
    failureProbability: float = 0.0
    confidence: str = "medium"


class AnalyzeResponse(BaseModel):
    studentId: str
    riskScore: float = 0.0
    riskPercent: int = 0
    riskLevel: str
    highestRiskSubject: str = ""
    subjectRisks: list[SubjectRisk]
    strengths: list[str]
    weaknesses: list[str]
    careerHint: str
    attendanceWarning: bool
    rootProblem: str = ""
    studyPath: list[str] = []


class TutorTextRequest(BaseModel):
    student_id: str
    subject_risks: list[dict]
    root_topic: str
    learning_path: list[str]


class TutorTextResponse(BaseModel):
    text: str
