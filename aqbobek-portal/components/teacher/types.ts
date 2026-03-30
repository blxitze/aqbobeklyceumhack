export type RiskLevel = "low" | "medium" | "high";

export type SubjectTrend = "improving" | "declining" | "stable";

export type SubjectAverage = {
  subject: string;
  foPercent: number | null;
  sorPercent: number | null;
  socPercent: number | null;
  finalPercent: number | null;
  predictedGrade: 2 | 3 | 4 | 5 | null;
  gradeLabel: "Отлично" | "Хорошо" | "Удовл." | "Неудовл." | "—";
  trend: SubjectTrend;
};

export type TeacherStudent = {
  id: string;
  name: string;
  classId: string;
  className: string;
  finalPercent: number | null;
  socPercent: number | null;
  predictedGrade: 2 | 3 | 4 | 5 | null;
  attendanceRate: number;
  subjectAverages: SubjectAverage[];
  riskLevel: RiskLevel;
  weakestSubject: string;
  trend: SubjectTrend;
};

export type TeacherClassWithStudents = {
  classId: string;
  className: string;
  students: TeacherStudent[];
};

export type TeacherClassReportStats = {
  classId: string;
  className: string;
  classFinalPercent: number | null;
  classBySubject: Record<
    string,
    {
      foPercent: number | null;
      sorPercent: number | null;
      socPercent: number | null;
      finalPercent: number | null;
      predictedGrade: 2 | 3 | 4 | 5 | null;
    }
  >;
  atRiskCount: number;
  topStudents: Array<{ id: string; name: string; finalPercent: number | null; predictedGrade: 2 | 3 | 4 | 5 | null }>;
  mostMissedTopic: string;
  attendanceRate: number;
};
