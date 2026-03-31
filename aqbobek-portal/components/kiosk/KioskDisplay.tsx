"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";

import { pusherClient } from "@/lib/pusher-client";

export interface KioskProps {
  topStudents: {
    name: string;
    className: string;
    finalPercent: number;
    predictedGrade: number;
  }[];
  substitutions: {
    originalTeacherName: string;
    substituteTeacherName: string | null;
    reason: string;
    date: string;
  }[];
  announcements: {
    title: string;
    body: string;
    authorName: string;
    createdAt: string;
  }[];
}

type SubstitutionEventPayload = {
  originalTeacherName?: string;
  substituteTeacherName?: string | null;
  reason?: string;
  date?: string;
  message?: string;
  diff?: string[];
};

type NotificationPayload = {
  title?: string;
  body?: string;
  message?: string;
};

const slideMotion = {
  initial: { x: 220, opacity: 0 },
  animate: { x: 0, opacity: 1 },
  exit: { x: -220, opacity: 0 },
};

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function rankBadge(position: number): string {
  if (position === 0) return "🥇";
  if (position === 1) return "🥈";
  if (position === 2) return "🥉";
  return `${position + 1}.`;
}

export default function KioskDisplay(props: KioskProps) {
  const [topStudents, setTopStudents] = useState(props.topStudents);
  const [substitutions, setSubstitutions] = useState(props.substitutions);
  const [announcements, setAnnouncements] = useState(props.announcements);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [flashMessage, setFlashMessage] = useState("");
  const [highlightSubstitution, setHighlightSubstitution] = useState(false);
  const flashTimeoutRef = useRef<number | null>(null);
  const highlightTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % 3);
    }, 10000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = window.setInterval(async () => {
      try {
        const res = await fetch("/api/kiosk/data", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as KioskProps;
        setTopStudents(data.topStudents ?? []);
        setSubstitutions(data.substitutions ?? []);
        setAnnouncements(data.announcements ?? []);
      } catch {
        // Silent fallback for kiosk reliability.
      }
    }, 60000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const el = document.documentElement;
    if (el.requestFullscreen) {
      el.requestFullscreen().catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_PUSHER_KEY || !pusherClient) return;
    const client = pusherClient;

    const scheduleChannel = client.subscribe("schedule-updates");
    const notificationsChannel = client.subscribe("notifications");

    const onSubstitution = (payload: SubstitutionEventPayload) => {
      setSubstitutions((prev) => [
        {
          originalTeacherName: payload.originalTeacherName ?? "Учитель не указан",
          substituteTeacherName: payload.substituteTeacherName ?? null,
          reason:
            payload.reason ??
            payload.message ??
            payload.diff?.join(", ") ??
            "Обновление замены в расписании",
          date: payload.date ?? new Date().toISOString(),
        },
        ...prev,
      ].slice(0, 6));
      setCurrentSlide(1);
      setHighlightSubstitution(true);

      if (highlightTimeoutRef.current) {
        window.clearTimeout(highlightTimeoutRef.current);
      }
      highlightTimeoutRef.current = window.setTimeout(() => setHighlightSubstitution(false), 8000);
    };

    const onNotification = (payload: NotificationPayload) => {
      setAnnouncements((prev) => [
        {
          title: payload.title?.trim() || "Новое объявление",
          body: payload.message?.trim() || payload.body?.trim() || "Появилось новое сообщение.",
          authorName: "Система",
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ].slice(0, 6));

      setFlashMessage("Новое уведомление!");
      if (flashTimeoutRef.current) {
        window.clearTimeout(flashTimeoutRef.current);
      }
      flashTimeoutRef.current = window.setTimeout(() => setFlashMessage(""), 3000);
    };

    scheduleChannel.bind("substitution", onSubstitution);
    notificationsChannel.bind("new-notification", onNotification);

    return () => {
      scheduleChannel.unbind("substitution", onSubstitution);
      notificationsChannel.unbind("new-notification", onNotification);
      client.unsubscribe("schedule-updates");
      client.unsubscribe("notifications");
      if (flashTimeoutRef.current) window.clearTimeout(flashTimeoutRef.current);
      if (highlightTimeoutRef.current) window.clearTimeout(highlightTimeoutRef.current);
    };
  }, []);

  const slideContent = useMemo(() => {
    if (currentSlide === 0) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-8">
          <h1 style={{ fontSize: "72px" }}>🏆 Лучшие ученики</h1>
          {topStudents.map((student, index) => (
            <div key={`${student.name}-${index}`} className="flex items-center gap-6">
              <span style={{ fontSize: "64px" }}>{rankBadge(index)}</span>
              <div>
                <div style={{ fontSize: "48px", fontWeight: "bold" }}>{student.name}</div>
                <div style={{ fontSize: "32px", color: "#94a3b8" }}>
                  {student.className} • {formatPercent(student.finalPercent)} • Оценка {student.predictedGrade}
                </div>
              </div>
            </div>
          ))}
          {topStudents.length === 0 && (
            <p style={{ fontSize: "48px", color: "#64748b" }}>Данные загружаются...</p>
          )}
        </div>
      );
    }

    if (currentSlide === 1) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-8">
          <h1 style={{ fontSize: "72px" }}>📋 Замены сегодня</h1>
          {substitutions.length === 0 ? (
            <p style={{ fontSize: "48px", color: "#4ade80" }}>✓ Замен нет — расписание без изменений</p>
          ) : (
            substitutions.map((sub, index) => (
              <div key={`${sub.originalTeacherName}-${index}`} className="text-center">
                <div style={{ fontSize: "48px" }}>{sub.originalTeacherName}</div>
                <div style={{ fontSize: "36px", color: "#fbbf24" }}>
                  {sub.substituteTeacherName
                    ? `→ Замена: ${sub.substituteTeacherName}`
                    : "→ Замена уточняется"}
                </div>
                <div style={{ fontSize: "28px", color: "#94a3b8" }}>{sub.reason}</div>
              </div>
            ))
          )}
        </div>
      );
    }

    return (
      <div className="flex h-full flex-col items-center justify-center gap-8 px-16">
        <h1 style={{ fontSize: "72px" }}>📢 Объявления</h1>
        {announcements.length === 0 ? (
          <p style={{ fontSize: "48px", color: "#64748b" }}>Объявлений нет</p>
        ) : (
          announcements.map((item, index) => (
            <div key={`${item.title}-${index}`} className="max-w-4xl text-center">
              <div style={{ fontSize: "48px", fontWeight: "bold" }}>{item.title}</div>
              <div style={{ fontSize: "36px", color: "#cbd5e1", marginTop: "16px" }}>{item.body}</div>
              <div style={{ fontSize: "24px", color: "#64748b", marginTop: "8px" }}>{item.authorName}</div>
            </div>
          ))
        )}
      </div>
    );
  }, [announcements, currentSlide, substitutions, topStudents]);

  return (
    <section
      className="relative h-screen w-screen overflow-hidden bg-slate-900 text-white cursor-none"
      onClick={() => setCurrentSlide((prev) => (prev + 1) % 3)}
      role="presentation"
    >
      <header className="absolute top-8 left-1/2 z-20 -translate-x-1/2 text-[32px] tracking-wide text-slate-200">
        Aqbobek Lyceum
      </header>

      {highlightSubstitution ? (
        <div className="absolute top-8 right-10 z-20 rounded-full bg-amber-400 px-5 py-2 text-[32px] font-bold text-slate-950">
          ЗАМЕНА
        </div>
      ) : null}

      {flashMessage ? (
        <div className="absolute top-24 left-1/2 z-20 -translate-x-1/2 rounded-full bg-blue-600/90 px-6 py-3 text-[32px]">
          {flashMessage}
        </div>
      ) : null}

      <AnimatePresence mode="wait">
        <motion.div
          key={currentSlide}
          initial="initial"
          animate="animate"
          exit="exit"
          variants={slideMotion}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          className="h-full w-full px-12 pt-24 pb-20"
        >
          {slideContent}
        </motion.div>
      </AnimatePresence>

      <div className="absolute bottom-8 left-1/2 flex -translate-x-1/2 gap-4">
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            className={`h-2 rounded-full transition-all duration-300 ${
              index === currentSlide ? "w-16 bg-white" : "w-8 bg-gray-600"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
