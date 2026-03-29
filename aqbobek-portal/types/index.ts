export type Role = "STUDENT" | "TEACHER" | "PARENT" | "ADMIN";

export interface Grade {
  studentId: string;
  subject: string;
  topic: string;
  score: number;
  date: string;
  attendance: "present" | "absent" | "late" | "excused";
}

export interface ScheduleSlot {
  id: string;
  teacherId: string;
  classId: string;
  roomId: string;
  subject: string;
  dayOfWeek: string;
  timeSlot: string;
}

export interface AiTutorResult {
  riskScore: number;
  rootTopic: string;
  weakTopics: string[];
  careerHint: string;
  textExplanation: string;
}

export interface KioskSlide {
  type: "top-students" | "substitutions" | "announcements";
  data: Record<string, unknown>;
}
