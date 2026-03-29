export type RiskLevel = "low" | "medium" | "high";

export type SubjectTrend = "improving" | "declining" | "stable";

export type SubjectAverage = {
  subject: string;
  average: number;
  trend: SubjectTrend;
};

export type TeacherStudent = {
  id: string;
  name: string;
  classId: string;
  className: string;
  averageScore: number;
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
  classAverage: number;
  classAverageBySubject: Record<string, number>;
  atRiskCount: number;
  topStudents: Array<{ id: string; name: string; averageScore: number }>;
  mostMissedTopic: string;
  attendanceRate: number;
};
