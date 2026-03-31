"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Bell, X } from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";

import { pusherClient } from "@/lib/pusher-client";

type UserRole = "STUDENT" | "TEACHER" | "PARENT" | "ADMIN";
type ToastKind = "notification" | "substitution";

interface NotificationPayload {
  title?: string;
  body?: string;
  message?: string;
  diff?: string[];
  targetRole?: UserRole | null;
  originalTeacherName?: string;
  substituteTeacherName?: string;
  date?: string;
}

interface ToastItem {
  id: string;
  kind: ToastKind;
  title: string;
  body: string;
  targetRole: UserRole | null;
}

export default function PusherNotificationBanner() {
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState<ToastItem[]>([]);
  const hideTimeoutsRef = useRef<Map<string, number>>(new Map());

  const currentRole = session?.user?.role as UserRole | undefined;

  const dismissNotification = (id: string) => {
    const timeoutId = hideTimeoutsRef.current.get(id);
    if (timeoutId) {
      window.clearTimeout(timeoutId);
      hideTimeoutsRef.current.delete(id);
    }
    setNotifications((prev) => prev.filter((item) => item.id !== id));
  };

  const enqueueNotification = (item: Omit<ToastItem, "id">) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const next: ToastItem = { id, ...item };

    setNotifications((prev) => [next, ...prev].slice(0, 5));
    const timeoutId = window.setTimeout(() => dismissNotification(id), 8000);
    hideTimeoutsRef.current.set(id, timeoutId);
  };

  useEffect(() => {
    if (!pusherClient) return;
    const client = pusherClient;

    const scheduleChannel = client.subscribe("schedule-updates");
    const notificationsChannel = client.subscribe("notifications");

    const handleSubstitution = (payload: NotificationPayload) => {
      if (!currentRole) return;
      // Substitutions are visible to ADMIN/TEACHER/STUDENT only.
      if (currentRole === "PARENT") return;

      const title = payload.title?.trim() || "Изменение в расписании";
      const body =
        payload.message?.trim() ||
        payload.diff?.join(", ") ||
        [
          payload.originalTeacherName ? `Вместо: ${payload.originalTeacherName}` : null,
          payload.substituteTeacherName ? `Замещает: ${payload.substituteTeacherName}` : null,
        ]
          .filter(Boolean)
          .join(" · ") ||
        "Появилась новая замена по расписанию.";

      enqueueNotification({
        kind: "substitution",
        title,
        body,
        targetRole: null,
      });
    };

    const handleNotification = (payload: NotificationPayload) => {
      if (!currentRole) return;
      // Show only global notifications or notifications targeted to current role.
      if (payload.targetRole && payload.targetRole !== currentRole) {
        return;
      }

      enqueueNotification({
        kind: "notification",
        title: payload.title?.trim() || "Уведомление",
        body: payload.message?.trim() || payload.body?.trim() || "Новое уведомление.",
        targetRole: payload.targetRole ?? null,
      });
    };

    scheduleChannel.bind("substitution", handleSubstitution);
    notificationsChannel.bind("new-notification", handleNotification);

    return () => {
      scheduleChannel.unbind("substitution", handleSubstitution);
      notificationsChannel.unbind("new-notification", handleNotification);
      client.unsubscribe("schedule-updates");
      client.unsubscribe("notifications");

      hideTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
      hideTimeoutsRef.current.clear();
    };
  }, [currentRole]);

  if (notifications.length === 0) return null;

  return (
    <div className="pointer-events-none fixed top-4 right-4 z-50 flex w-[calc(100vw-2rem)] max-w-[380px] flex-col gap-3">
      <AnimatePresence initial={false}>
        {notifications.map((item) => {
          const isSubstitution = item.kind === "substitution";
          const accentClass = isSubstitution ? "bg-amber-500" : "bg-blue-600";
          const iconWrapClass = isSubstitution
            ? "bg-amber-100 text-amber-700"
            : "bg-blue-100 text-blue-700";
          const progressClass = isSubstitution ? "bg-amber-500/80" : "bg-blue-600/80";

          return (
            <motion.div
              key={item.id}
              initial={{ x: 400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 400, opacity: 0 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
              className="pointer-events-auto relative overflow-hidden rounded-xl border border-slate-200 bg-white py-3 pr-10 pl-4 shadow-2xl"
              role="status"
              aria-live="polite"
              style={{
                fontFamily:
                  '"Plus Jakarta Sans", "Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
              }}
            >
              <div className={`absolute top-0 left-0 h-full w-1 ${accentClass}`} />
              <button
                type="button"
                onClick={() => dismissNotification(item.id)}
                className="absolute top-2 right-2 rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Закрыть уведомление"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="flex items-start gap-3">
                <div className={`mt-0.5 rounded-full p-1.5 ${iconWrapClass}`}>
                  {isSubstitution ? <AlertTriangle className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                </div>
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold text-slate-900">{item.title}</p>
                  <p
                    className="mt-1 text-[13px] text-slate-600"
                    style={{
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {item.body}
                  </p>
                </div>
              </div>

              <motion.div
                className={`absolute right-0 bottom-0 left-0 h-1 origin-left ${progressClass}`}
                initial={{ scaleX: 1 }}
                animate={{ scaleX: 0 }}
                transition={{ duration: 8, ease: "linear" }}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
