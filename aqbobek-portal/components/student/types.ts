export type Grade = {
  id: string;
  subject: string;
  topic: string;
  score: number;
  maxScore: number;
  percentage: number;
  date: string;
  attendance: boolean;
  letterGrade: string;
};

export type GradesSummary = {
  totalGrades: number;
  averageScore: number;
  attendanceRate: number;
  bestSubject: string;
  weakestSubject: string;
};

export type GradesResponse = {
  studentId: string;
  studentName: string;
  grades: Grade[];
  summary: GradesSummary;
};

export type RiskLevel = "low" | "medium" | "high";

export type SubjectRisk = {
  subject: string;
  averageScore: number;
  trend: "improving" | "declining" | "stable";
  missedTopics: string[];
  riskScore: number;
};

export type AnalyticsResponse = {
  studentId: string;
  riskLevel: RiskLevel;
  subjectRisks: SubjectRisk[];
  strengths: string[];
  weaknesses: string[];
  attendanceWarning: boolean;
};

export type SubjectAverage = {
  subject: string;
  average: number;
  trend: "improving" | "declining" | "stable";
};

export type StudentFromClassResponse = {
  id: string;
  name: string;
  classId: string;
  className: string;
  averageScore: number;
  attendanceRate: number;
  subjectAverages: SubjectAverage[];
};
