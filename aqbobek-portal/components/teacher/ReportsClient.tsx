"use client";

import { useState } from "react";

import type { TeacherClassReportStats } from "@/components/teacher/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

type ClassCard = {
  id: string;
  name: string;
  studentCount: number;
};

type ReportsClientProps = {
  classes: ClassCard[];
};

type ReportResponse = {
  report: string;
  stats: TeacherClassReportStats;
};

export default function ReportsClient({ classes }: ReportsClientProps) {
  const [loadingClassId, setLoadingClassId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reportData, setReportData] = useState<ReportResponse | null>(null);
  const [open, setOpen] = useState(false);
  const [cachedReports, setCachedReports] = useState<Record<string, ReportResponse>>({});

  async function generateReport(classId: string) {
    const inState = cachedReports[classId];
    if (inState) {
      setReportData(inState);
      setOpen(true);
      return;
    }

    const storageKey = `teacher-report-${classId}`;
    if (typeof window !== "undefined") {
      const cached = sessionStorage.getItem(storageKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached) as ReportResponse;
          setCachedReports((prev) => ({ ...prev, [classId]: parsed }));
          setReportData(parsed);
          setOpen(true);
          return;
        } catch {
          sessionStorage.removeItem(storageKey);
        }
      }
    }

    setLoadingClassId(classId);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/ai/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId }),
      });
      const payload = (await response.json()) as ReportResponse & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Не удалось сгенерировать отчёт");
      }

      setCachedReports((prev) => ({ ...prev, [classId]: payload }));
      if (typeof window !== "undefined") {
        sessionStorage.setItem(storageKey, JSON.stringify(payload));
      }
      setReportData(payload);
      setOpen(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Не удалось сгенерировать отчёт";
      setErrorMessage(message);
    } finally {
      setLoadingClassId(null);
    }
  }

  return (
    <>
      {errorMessage ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errorMessage}</div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {classes.map((classItem) => (
          <Card key={classItem.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{classItem.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">Учеников: {classItem.studentCount}</p>
              <Button className="w-full" onClick={() => generateReport(classItem.id)} disabled={loadingClassId === classItem.id}>
                {loadingClassId === classItem.id ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                    Генерация...
                  </span>
                ) : (
                  "Сгенерировать отчёт"
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>AI-отчёт по классу</SheetTitle>
            <SheetDescription>Сформировано на основе детерминированной аналитики</SheetDescription>
          </SheetHeader>

          {reportData ? (
            <div className="space-y-6">
              <div className="rounded-lg border bg-muted/20 p-4 text-sm leading-6 whitespace-pre-line">
                {reportData.report}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Средний балл класса</CardTitle>
                  </CardHeader>
                  <CardContent className="text-xl font-semibold">{reportData.stats.classAverage.toFixed(1)}</CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">В зоне риска</CardTitle>
                  </CardHeader>
                  <CardContent className="text-xl font-semibold">{reportData.stats.atRiskCount}</CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Посещаемость</CardTitle>
                  </CardHeader>
                  <CardContent className="text-xl font-semibold">{reportData.stats.attendanceRate.toFixed(1)}%</CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Проблемная тема</CardTitle>
                  </CardHeader>
                  <CardContent className="text-base font-semibold">{reportData.stats.mostMissedTopic || "—"}</CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Средние баллы по предметам</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {Object.entries(reportData.stats.classAverageBySubject).map(([subject, value]) => (
                    <div key={subject} className="flex items-center justify-between">
                      <span>{subject}</span>
                      <span className="font-semibold">{value.toFixed(1)}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}
