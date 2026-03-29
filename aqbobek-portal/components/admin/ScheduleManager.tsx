"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ClassOption = { id: string; name: string };
type TeacherOption = { id: string; name: string };
type Slot = {
  id: string;
  classId: string;
  teacherId: string;
  subject: string;
  room: string;
  dayOfWeek: number;
  timeSlot: number;
};
type Substitution = {
  id: string;
  date: string;
  reason: string;
  originalTeacherName: string;
};

type ScheduleManagerProps = {
  classes: ClassOption[];
  teachers: TeacherOption[];
  scheduleSlots: Slot[];
  substitutions: Substitution[];
};

const DAYS = [
  { key: 1, label: "Пн" },
  { key: 2, label: "Вт" },
  { key: 3, label: "Ср" },
  { key: 4, label: "Чт" },
  { key: 5, label: "Пт" },
];
const SUBJECT_COLORS: Record<string, string> = {
  Математика: "bg-indigo-100 text-indigo-700",
  Физика: "bg-amber-100 text-amber-700",
  Информатика: "bg-emerald-100 text-emerald-700",
  История: "bg-pink-100 text-pink-700",
  Биология: "bg-teal-100 text-teal-700",
};

export default function ScheduleManager({
  classes,
  teachers,
  scheduleSlots,
  substitutions,
}: ScheduleManagerProps) {
  const [selectedClassId, setSelectedClassId] = useState(classes[0]?.id ?? "");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateMessage, setGenerateMessage] = useState<string | null>(null);

  const [teacherId, setTeacherId] = useState(teachers[0]?.id ?? "");
  const [substituteDate, setSubstituteDate] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState("");
  const [isSubstituting, setIsSubstituting] = useState(false);
  const [substitutionMessage, setSubstitutionMessage] = useState<string | null>(null);

  const teacherMap = useMemo(
    () => new Map(teachers.map((teacher) => [teacher.id, teacher.name])),
    [teachers],
  );

  const filteredSlots = scheduleSlots.filter(
    (slot) => !selectedClassId || slot.classId === selectedClassId,
  );

  const slotMap = new Map<string, Slot>();
  for (const slot of filteredSlots) {
    slotMap.set(`${slot.dayOfWeek}-${slot.timeSlot}`, slot);
  }

  async function generateSchedule() {
    setIsGenerating(true);
    setGenerateMessage(null);
    try {
      const response = await fetch("/api/schedule/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: selectedDate }),
      });
      const payload = (await response.json()) as { message?: string; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Ошибка генерации");
      setGenerateMessage(payload.message ?? "Генерация завершена");
      window.location.reload();
    } catch (error) {
      setGenerateMessage(error instanceof Error ? error.message : "Ошибка генерации");
    } finally {
      setIsGenerating(false);
    }
  }

  async function createSubstitution(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubstituting(true);
    setSubstitutionMessage(null);
    try {
      const response = await fetch("/api/schedule/substitute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacherId,
          date: substituteDate,
          reason,
        }),
      });
      const payload = (await response.json()) as { message?: string; error?: string; diff?: unknown[] };
      if (!response.ok) throw new Error(payload.error ?? "Ошибка замены");
      const changed = payload.diff?.length ?? 0;
      setSubstitutionMessage(
        changed > 0
          ? `Изменено ${changed} уроков. Уведомления отправлены.`
          : payload.message ?? "Расписание пересчитывается...",
      );
      setReason("");
      window.location.reload();
    } catch (error) {
      setSubstitutionMessage(error instanceof Error ? error.message : "Ошибка замены");
    } finally {
      setIsSubstituting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <p className="mb-1 text-sm font-medium">Дата</p>
          <Input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
        </div>
        <div>
          <p className="mb-1 text-sm font-medium">Класс</p>
          <select
            value={selectedClassId}
            onChange={(event) => setSelectedClassId(event.target.value)}
            className="h-8 rounded-lg border border-input bg-background px-2 text-sm"
          >
            {classes.map((classItem) => (
              <option key={classItem.id} value={classItem.id}>
                {classItem.name}
              </option>
            ))}
          </select>
        </div>
        <Button onClick={() => void generateSchedule()} disabled={isGenerating}>
          {isGenerating ? "Генерация расписания..." : "Сгенерировать расписание"}
        </Button>
      </div>

      {generateMessage ? <p className="text-sm text-muted-foreground">{generateMessage}</p> : null}

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[780px] text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="p-2 text-left">Урок</th>
              {DAYS.map((day) => (
                <th key={day.key} className="p-2 text-left">
                  {day.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 6 }, (_, index) => index + 1).map((slotIndex) => (
              <tr key={slotIndex} className="border-b">
                <td className="p-2 font-semibold">{slotIndex}</td>
                {DAYS.map((day) => {
                  const slot = slotMap.get(`${day.key}-${slotIndex}`);
                  if (!slot) {
                    return (
                      <td key={`${day.key}-${slotIndex}`} className="p-2 text-xs text-muted-foreground">
                        <div className="rounded-md bg-muted px-2 py-3 text-center">—</div>
                      </td>
                    );
                  }
                  const badgeClass = SUBJECT_COLORS[slot.subject] ?? "bg-muted text-foreground";
                  return (
                    <td key={`${day.key}-${slotIndex}`} className="p-2 align-top">
                      <div className={`rounded-md px-2 py-2 text-xs ${badgeClass}`}>
                        <p className="font-semibold">{slot.subject}</p>
                        <p>{teacherMap.get(slot.teacherId) ?? "Учитель"}</p>
                        <p>Каб. {slot.room}</p>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="space-y-3 rounded-lg border bg-card p-4">
        <h3 className="text-base font-semibold">Замены учителей</h3>
        <form className="grid gap-3 md:grid-cols-4" onSubmit={createSubstitution}>
          <select
            value={teacherId}
            onChange={(event) => setTeacherId(event.target.value)}
            className="h-8 rounded-lg border border-input bg-background px-2 text-sm"
          >
            {teachers.map((teacher) => (
              <option key={teacher.id} value={teacher.id}>
                {teacher.name}
              </option>
            ))}
          </select>
          <Input type="date" value={substituteDate} onChange={(event) => setSubstituteDate(event.target.value)} />
          <Input
            placeholder="Причина"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            required
          />
          <Button type="submit" disabled={isSubstituting}>
            {isSubstituting ? "Расписание пересчитывается..." : "Оформить замену"}
          </Button>
        </form>
        {substitutionMessage ? <p className="text-sm text-muted-foreground">{substitutionMessage}</p> : null}

        <div className="space-y-2">
          <p className="text-sm font-medium">Активные замены на сегодня</p>
          {substitutions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Сегодня замен нет</p>
          ) : (
            substitutions.map((item) => (
              <div key={item.id} className="rounded-md border px-3 py-2 text-sm">
                <p className="font-medium">{item.originalTeacherName}</p>
                <p className="text-xs text-muted-foreground">
                  {item.date} — {item.reason}
                </p>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
