export type GradeType = "SOR" | "SOC" | "CURRENT";

export interface GradeItem {
  id: string;
  subject: string;
  topic: string;
  score: number;
  maxScore: number;
  type: GradeType;
  typeLabel: string;
  date: string;
  percent: number;
}

export type Grade = GradeItem & {
  attendance: boolean;
  percentage?: number;
};

export type GradesSummary = {
  totalGrades: number;
  attendanceRate: number;
  bestSubject: string;
  weakestSubject: string;
  foPercent: number | null;
  sorPercent: number | null;
  socPercent: number | null;
  finalPercent: number | null;
  predictedGrade: 2 | 3 | 4 | 5 | null;
  gradeLabel: "Отлично" | "Хорошо" | "Удовл." | "Неудовл." | "—";
};

export type GradesResponse = {
  studentId: string;
  studentName: string;
  grades: Grade[];
  socGrades: Grade[];
  sorGrades: Grade[];
  summary: GradesSummary;
};

export type RiskLevel = "low" | "medium" | "high";

export type SubjectRisk = {
  subject: string;
  foPercent: number | null;
  sorPercent: number | null;
  socPercent: number | null;
  finalPercent: number | null;
  predictedGrade: 2 | 3 | 4 | 5 | null;
  gradeLabel: "Отлично" | "Хорошо" | "Удовл." | "Неудовл." | "—";
  trend: "improving" | "declining" | "stable";
  missedTopics: string[];
  riskScore: number;
};

export type AnalyticsResponse = {
  studentId: string;
  riskLevel: RiskLevel;
  foPercent: number | null;
  sorPercent: number | null;
  socPercent: number | null;
  finalPercent: number | null;
  predictedGrade: 2 | 3 | 4 | 5 | null;
  subjectRisks: SubjectRisk[];
  strengths: string[];
  weaknesses: string[];
  attendanceWarning: boolean;
};

export type SubjectAverage = {
  subject: string;
  foPercent: number | null;
  sorPercent: number | null;
  socPercent: number | null;
  finalPercent: number | null;
  predictedGrade: 2 | 3 | 4 | 5 | null;
  gradeLabel: "Отлично" | "Хорошо" | "Удовл." | "Неудовл." | "—";
  trend: "improving" | "declining" | "stable";
};

export type SubjectSummary = SubjectAverage;

export type StudentFromClassResponse = {
  id: string;
  name: string;
  classId: string;
  className: string;
  foPercent: number | null;
  sorPercent: number | null;
  socPercent: number | null;
  finalPercent: number | null;
  predictedGrade: 2 | 3 | 4 | 5 | null;
  attendanceRate: number;
  subjectAverages: SubjectAverage[];
};
