from pydantic import BaseModel


class AnalyzeRequest(BaseModel):
    studentId: str


class SubjectRisk(BaseModel):
    subject: str
    averageScore: float
    trend: str
    missedTopics: list[str]
    riskScore: float


class AnalyzeResponse(BaseModel):
    studentId: str
    riskLevel: str
    subjectRisks: list[SubjectRisk]
    strengths: list[str]
    weaknesses: list[str]
    careerHint: str
    attendanceWarning: str


class TutorTextRequest(BaseModel):
    studentId: str
    analyzeResult: AnalyzeResponse


class TutorTextResponse(BaseModel):
    text: str
