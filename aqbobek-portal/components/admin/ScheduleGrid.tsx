"use client";

import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { dateToIsoWeekday } from "@/lib/date-utils";
import { cn } from "@/lib/utils";

type ScheduleSlot = {
  id: string;
  classId: string;
  className: string;
  subject: string;
  teacherId: string;
  room: string;
  dayOfWeek: number;
  timeSlot: number;
};

type SubstitutionRecord = {
  id: string;
  originalTeacherId: string;
  substituteTeacherId: string | null;
  date: string;
  reason: string;
  originalTeacherName: string;
  substituteTeacherName: string;
};

interface Props {
  classes: { id: string; name: string }[];
  teachers: { id: string; userName: string }[];
  initialDate: string;
}

const WEEKDAYS = [
  { iso: 1, label: "Пн" },
  { iso: 2, label: "Вт" },
  { iso: 3, label: "Ср" },
  { iso: 4, label: "Чт" },
  { iso: 5, label: "Пт" },
] as const;

const TIME_SLOTS = [1, 2, 3, 4, 5, 6] as const;

function toLocalDateISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getWeekDates(dateStr: string): string[] {
  const [year, month, day] = dateStr.split("-").map(Number);
  const selected = new Date(year, month - 1, day);
  const iso = dateToIsoWeekday(dateStr);
  const monday = new Date(selected);
  monday.setDate(selected.getDate() - (iso - 1));
  return [0, 1, 2, 3, 4].map((offset) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + offset);
    return toLocalDateISO(d);
  });
}

export default function ScheduleGrid({ classes, teachers, initialDate }: Props) {
  const [hydrated, setHydrated] = useState(false);
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [selectedClassId, setSelectedClassId] = useState(classes[0]?.id ?? "");
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [substitutions, setSubstitutions] = useState<SubstitutionRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [fastapiOnline, setFastapiOnline] = useState(false);
  const [message, setMessage] = useState("");

  const [subTeacherId, setSubTeacherId] = useState(teachers[0]?.id ?? "");
  const [subDate, setSubDate] = useState(initialDate);
  const [subReason, setSubReason] = useState("");
  const [subLoading, setSubLoading] = useState(false);
  const [subMessage, setSubMessage] = useState("");

  useEffect(() => {
    fetch("/api/fastapi-health")
      .then((r) => r.json())
      .then((d: { online?: boolean }) => setFastapiOnline(d.online === true))
      .catch(() => setFastapiOnline(false));
  }, []);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const loadSlotsFromDB = useCallback(async (classId: string, date: string) => {
    if (!classId || !date) {
      setSlots([]);
      setSubstitutions([]);
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      const weekDates = getWeekDates(date);
      const dayResponses = await Promise.all(
        weekDates.map(async (dayDate) => {
          const params = new URLSearchParams({ classId, date: dayDate });
          const res = await fetch(`/api/schedule/slots?${params.toString()}`);
          const data = (await res.json()) as { slots?: ScheduleSlot[] };
          return data.slots ?? [];
        }),
      );
      const allSlots = dayResponses.flat();
      setSlots(allSlots);

      const subResponses = await Promise.all(
        weekDates.map(async (dayDate) => {
          const params = new URLSearchParams({ date: dayDate });
          const res = await fetch(`/api/schedule/substitutions?${params.toString()}`);
          const data = (await res.json()) as { substitutions?: SubstitutionRecord[] };
          return data.substitutions ?? [];
        }),
      );
      setSubstitutions(subResponses.flat());
    } catch {
      setSlots([]);
      setSubstitutions([]);
      setMessage("Ошибка загрузки расписания");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSlotsFromDB(selectedClassId, selectedDate);
  }, [selectedClassId, selectedDate, loadSlotsFromDB]);

  const handleClassChange = (classId: string) => {
    setSlots([]);
    setSubstitutions([]);
    setSelectedClassId(classId);
  };

  const handleDateChange = (date: string) => {
    setSlots([]);
    setSubstitutions([]);
    setSelectedDate(date);
  };

  const handleGenerate = async () => {
    if (!selectedClassId) return;
    setGenerating(true);
    setMessage("");
    try {
      const res = await fetch("/api/schedule/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedDate,
          classId: selectedClassId,
        }),
      });
      const data = (await res.json()) as { message?: string };
      setMessage(data.message ?? "");
      await loadSlotsFromDB(selectedClassId, selectedDate);
    } catch {
      setMessage("Ошибка генерации");
    } finally {
      setGenerating(false);
    }
  };

  const handleSubstitute = async () => {
    if (!subTeacherId || !subDate) return;
    setSubLoading(true);
    setSubMessage("");
    try {
      const res = await fetch("/api/schedule/substitute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalTeacherId: subTeacherId,
          date: subDate,
          reason: subReason || "Не указана",
        }),
      });
      const data = (await res.json()) as { message?: string; error?: string };

      if (res.ok) {
        setSubMessage(data.message ?? "Замена выполнена");
        await loadSlotsFromDB(selectedClassId, selectedDate);
      } else {
        setSubMessage(data.error ?? data.message ?? "Ошибка при замене");
      }
    } catch {
      setSubMessage("Ошибка при замене");
    } finally {
      setSubLoading(false);
    }
  };

  const selectedDay = dateToIsoWeekday(selectedDate);
  const findSlot = (day: number, timeSlot: number) =>
    slots.find((s) => s.timeSlot === timeSlot && s.dayOfWeek === day);

  const isSlotSubstituted = (slot?: ScheduleSlot, dayOfWeek?: number) => {
    if (!slot || !dayOfWeek) return false;
    const weekDates = getWeekDates(selectedDate);
    const slotDate = weekDates[dayOfWeek - 1];
    return substitutions.some(
      (sub) =>
        sub.originalTeacherId === slot.teacherId &&
        new Date(sub.date).toISOString().slice(0, 10) === slotDate,
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Класс</Label>
          <select
            value={selectedClassId}
            onChange={(e) => handleClassChange(e.target.value)}
            className="h-8 rounded-md border border-input bg-background px-3 text-sm"
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Дата</Label>
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => handleDateChange(e.target.value)}
            className="h-8 w-40"
          />
        </div>

        <Button onClick={handleGenerate} disabled={!fastapiOnline || generating} size="sm">
          {generating ? "Генерация…" : "Генерировать расписание"}
        </Button>

        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
            fastapiOnline ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700",
          )}
        >
          <span
            className={cn(
              "inline-block h-1.5 w-1.5 rounded-full",
              fastapiOnline ? "bg-emerald-500" : "bg-red-500",
            )}
          />
          {fastapiOnline ? "FastAPI онлайн" : "FastAPI офлайн"}
        </span>
      </div>

      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">
            Расписание: {classes.find((c) => c.id === selectedClassId)?.name ?? ""}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Загрузка…</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14">Урок</TableHead>
                  {WEEKDAYS.map(({ iso, label }) => {
                    const hasSlots = hydrated && slots.some((s) => s.dayOfWeek === iso);
                    return (
                      <TableHead
                        key={iso}
                        className={cn(
                          "min-w-[100px] text-center",
                          !hasSlots && "bg-muted/50 text-muted-foreground",
                          selectedDay === iso &&
                            "bg-blue-100 font-bold text-primary dark:bg-primary/20",
                        )}
                      >
                        {hasSlots ? label : `${label} (не сгенерировано)`}
                      </TableHead>
                    );
                  })}
                </TableRow>
              </TableHeader>
              <TableBody>
                {TIME_SLOTS.map((rowSlot) => (
                  <TableRow key={rowSlot}>
                    <TableCell className="font-medium text-muted-foreground">
                      {rowSlot}
                    </TableCell>
                    {WEEKDAYS.map(({ iso }) => {
                      const slot = findSlot(iso, rowSlot);
                      const isToday = selectedDay === iso;
                      const substituted = isSlotSubstituted(slot, iso);
                      return (
                        <TableCell
                          key={iso}
                          className={cn(
                            "text-center text-sm",
                            isToday &&
                              "bg-blue-50 ring-1 ring-blue-200 dark:bg-primary/15 dark:ring-primary/25",
                          )}
                        >
                          {slot ? (
                            <div
                              className={cn(
                                "space-y-0.5",
                                substituted && "rounded border border-amber-200 bg-amber-50 p-1",
                              )}
                            >
                              <div className="font-medium text-sm">{slot.subject}</div>
                              <div className="text-xs text-muted-foreground">каб. {slot.room}</div>
                              {substituted ? (
                                <div className="mt-1 text-xs text-amber-600">⚠️ Замена</div>
                              ) : null}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Замена учителя</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Учитель</Label>
              <select
                value={subTeacherId}
                onChange={(e) => setSubTeacherId(e.target.value)}
                className="h-8 rounded-md border border-input bg-background px-3 text-sm"
              >
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.userName}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Дата</Label>
              <Input
                type="date"
                value={subDate}
                onChange={(e) => setSubDate(e.target.value)}
                className="h-8 w-40"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Причина</Label>
              <Input
                placeholder="Больничный"
                value={subReason}
                onChange={(e) => setSubReason(e.target.value)}
                className="h-8 w-48"
              />
            </div>

            <Button
              onClick={handleSubstitute}
              disabled={subLoading || !fastapiOnline}
              variant="outline"
              size="sm"
            >
              {subLoading ? "Обработка…" : "Назначить замену"}
            </Button>
          </div>

          {subMessage ? <p className="text-sm text-muted-foreground">{subMessage}</p> : null}

          {substitutions.length > 0 ? (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium">Последние замены:</p>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {substitutions.slice(0, 5).map((sub) => (
                  <li key={sub.id}>
                    {new Date(sub.date).toISOString().slice(0, 10)} — {sub.originalTeacherName} —{" "}
                    {sub.reason}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
