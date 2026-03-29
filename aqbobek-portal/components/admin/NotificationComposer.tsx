"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ClassOption = {
  id: string;
  name: string;
};

type NotificationComposerProps = {
  classes: ClassOption[];
};

type TargetType = "all" | "students" | "teachers" | "parents" | "class";

export default function NotificationComposer({ classes }: NotificationComposerProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [target, setTarget] = useState<TargetType>("all");
  const [targetClassId, setTargetClassId] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  async function submitForm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setToast(null);

    const payload: {
      title: string;
      body: string;
      targetRole?: "STUDENT" | "TEACHER" | "PARENT";
      targetClassId?: string;
    } = { title, body };

    if (target === "students") payload.targetRole = "STUDENT";
    if (target === "teachers") payload.targetRole = "TEACHER";
    if (target === "parents") payload.targetRole = "PARENT";
    if (target === "class" && targetClassId) payload.targetClassId = targetClassId;

    try {
      const response = await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const responsePayload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(responsePayload.error ?? "Ошибка отправки");

      setTitle("");
      setBody("");
      setTarget("all");
      setTargetClassId("");
      setToast("Уведомление отправлено");
      router.refresh();
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Ошибка отправки");
    } finally {
      setLoading(false);
      setTimeout(() => setToast(null), 2500);
    }
  }

  return (
    <form className="space-y-3" onSubmit={submitForm}>
      <div>
        <label className="mb-1 block text-sm font-medium">Заголовок</label>
        <Input required value={title} onChange={(event) => setTitle(event.target.value)} />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Сообщение</label>
        <textarea
          required
          value={body}
          onChange={(event) => setBody(event.target.value)}
          className="min-h-24 w-full rounded-md border border-input bg-background p-2 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Кому</label>
        <select
          value={target}
          onChange={(event) => setTarget(event.target.value as TargetType)}
          className="h-8 w-full rounded-lg border border-input bg-background px-2 text-sm"
        >
          <option value="all">Все</option>
          <option value="students">Только ученики</option>
          <option value="teachers">Только учителя</option>
          <option value="parents">Только родители</option>
          <option value="class">Конкретный класс</option>
        </select>
      </div>
      {target === "class" ? (
        <div>
          <label className="mb-1 block text-sm font-medium">Класс</label>
          <select
            value={targetClassId}
            onChange={(event) => setTargetClassId(event.target.value)}
            className="h-8 w-full rounded-lg border border-input bg-background px-2 text-sm"
            required
          >
            <option value="">Выберите класс</option>
            {classes.map((classItem) => (
              <option key={classItem.id} value={classItem.id}>
                {classItem.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      <Button disabled={loading} type="submit" className="w-full">
        {loading ? "Отправка..." : "Отправить"}
      </Button>
      {toast ? <p className="text-xs text-muted-foreground">{toast}</p> : null}
    </form>
  );
}
