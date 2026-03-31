"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Bell, Calendar, Trophy } from "lucide-react";

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

function formatClock(date: Date): string {
  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
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
  const [currentTime, setCurrentTime] = useState(formatClock(new Date()));
  const flashTimeoutRef = useRef<number | null>(null);
  const highlightTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setCurrentTime(formatClock(new Date()));
    }, 1000);
    return () => window.clearInterval(interval);
  }, []);

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
      const top3 = topStudents.slice(0, 3);
      const remaining = topStudents.slice(3, 7);
      return (
        <div className="flex h-full flex-col items-center justify-center px-16 pt-16">
          <div className="mb-12 flex items-center gap-3">
            <Trophy className="h-10 w-10 text-amber-400" />
            <h1 className="text-6xl font-bold text-white">Лучшие ученики</h1>
          </div>
          <div className="mb-8 grid w-full max-w-4xl grid-cols-3 gap-6">
            {top3.map((student, index) => (
              <div
                key={`${student.name}-${index}`}
                className={`rounded-2xl border p-8 text-center ${
                  index === 0 ? "border-amber-500/30 bg-amber-500/10" : "border-white/10 bg-white/5"
                }`}
              >
                <div className="mb-4 text-5xl">{rankBadge(index)}</div>
                <div
                  className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-3xl font-bold text-white"
                >
                  {initials(student.name)}
                </div>
                <div className="mb-1 text-2xl font-bold text-white">{student.name}</div>
                <div className="mb-3 text-lg text-slate-400">{student.className}</div>
                <div className={`font-mono text-4xl font-bold ${index === 0 ? "text-amber-400" : "text-white"}`}>
                  {student.finalPercent.toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-4">
            {remaining.map((s, i) => (
              <div key={`${s.name}-${i}`} className="flex items-center gap-3 rounded-xl bg-white/5 px-6 py-3">
                <span className="font-mono text-lg text-slate-500">#{i + 4}</span>
                <span className="text-xl font-medium text-white">{s.name}</span>
                <span className="font-mono text-xl text-blue-400">{s.finalPercent.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (currentSlide === 1) {
      const hasSubstitutions = substitutions.length > 0;
      return (
        <div className="flex h-full flex-col px-16 pt-20 pb-8">
          <div className="mb-8 flex items-center gap-3">
            <Calendar className="h-10 w-10 text-blue-400" />
            <h1 className="text-5xl font-bold">Расписание сегодня</h1>
            {hasSubstitutions && (
              <span className="ml-4 rounded-full border border-red-500/30 bg-red-500/20 px-4 py-2 text-xl font-semibold text-red-400 animate-pulse">
                ЗАМЕНА
              </span>
            )}
          </div>
          {!hasSubstitutions ? (
            <div className="mt-10 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-8 text-3xl text-emerald-300">
              Сегодня замен нет. Расписание без изменений.
            </div>
          ) : (
            substitutions.map((sub, index) => (
              <div
                key={`${sub.originalTeacherName}-${index}`}
                className="mb-4 flex items-center gap-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-8 py-4"
              >
                <AlertTriangle className="h-8 w-8 shrink-0 text-amber-400" />
                <div>
                  <div className="text-2xl font-bold text-amber-400">Замена учителя</div>
                  <div className="mt-1 text-xl text-slate-300">
                    {sub.originalTeacherName} → {sub.substituteTeacherName ?? "Назначается"}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      );
    }

    return (
      <div className="flex h-full flex-col items-center justify-center px-16 pt-16">
        <div className="mb-12 flex items-center gap-3">
          <Bell className="h-10 w-10 text-blue-400" />
          <h1 className="text-6xl font-bold">Объявления</h1>
        </div>
        {announcements.length === 0 ? (
          <p className="text-5xl text-slate-500">Объявлений нет</p>
        ) : (
          <div className="w-full max-w-4xl space-y-6">
            {announcements.map((ann, i) => (
              <div key={`${ann.title}-${i}`} className="rounded-2xl border border-white/10 bg-white/5 p-8">
                <div className="mb-3 text-3xl font-bold text-white">{ann.title}</div>
                <div className="text-xl leading-relaxed text-slate-400">{ann.body}</div>
                <div className="mt-4 text-base text-slate-600">{ann.authorName}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }, [announcements, currentSlide, substitutions, topStudents]);

  return (
    <section
      className="relative h-screen w-screen overflow-hidden bg-[#0A0F1E] text-white cursor-none"
      style={{ fontFamily: "Plus Jakarta Sans" }}
      onClick={() => setCurrentSlide((prev) => (prev + 1) % 3)}
      role="presentation"
    >
      <div className="absolute top-0 right-0 left-0 z-10 flex h-16 items-center justify-between border-b border-white/10 px-12">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500 font-bold text-white">A</div>
          <span className="text-lg font-semibold text-white">Aqbobek Lyceum</span>
        </div>
        <div className="font-mono text-sm text-slate-400">{currentTime}</div>
      </div>

      {flashMessage ? (
        <div className="absolute top-20 left-1/2 z-20 -translate-x-1/2 rounded-full bg-blue-600/90 px-6 py-3 text-2xl">
          {flashMessage}
        </div>
      ) : null}

      {highlightSubstitution ? (
        <div className="absolute top-20 right-12 z-20 rounded-full border border-amber-500/30 bg-amber-500/20 px-4 py-2 text-lg font-semibold text-amber-300">
          Обновление замены
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
          className="h-full w-full"
        >
          {slideContent}
        </motion.div>
      </AnimatePresence>

      <div className="absolute right-0 bottom-8 left-0 flex justify-center gap-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`rounded-full transition-all duration-300 ${
              i === currentSlide ? "h-3 w-8 bg-blue-500" : "h-3 w-3 bg-white/20"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
