"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const TYPE_OPTIONS = [
  { value: "CERTIFICATE" as const, label: "Сертификат" },
  { value: "ACHIEVEMENT" as const, label: "Достижение" },
  { value: "OLYMPIAD" as const, label: "Олимпиада" },
  { value: "OTHER" as const, label: "Другое" },
];

type PortfolioType = (typeof TYPE_OPTIONS)[number]["value"];

export default function PortfolioAddForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<PortfolioType>("ACHIEVEMENT");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);

    try {
      const res = await fetch("/api/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          type,
          date,
        }),
      });

      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Не удалось сохранить");
        return;
      }

      setTitle("");
      setDescription("");
      setType("ACHIEVEMENT");
      setDate(new Date().toISOString().slice(0, 10));
      setOpen(false);
      router.refresh();
    } catch {
      setError("Ошибка сети");
    } finally {
      setPending(false);
    }
  }

  if (!open) {
    return (
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        Добавить достижение
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Новое достижение</h2>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Отмена
        </Button>
      </div>

      <div className="space-y-2">
        <Label htmlFor="portfolio-title">Название</Label>
        <Input
          id="portfolio-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          maxLength={200}
          placeholder="Например: Региональная олимпиада"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="portfolio-desc">Описание</Label>
        <textarea
          id="portfolio-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={2000}
          rows={4}
          className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring"
          placeholder="Кратко опишите достижение"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="portfolio-type">Тип</Label>
        <select
          id="portfolio-type"
          value={type}
          onChange={(e) => setType(e.target.value as PortfolioType)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring"
        >
          {TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="portfolio-date">Дата</Label>
        <Input id="portfolio-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Сохранение…" : "Сохранить"}
      </Button>
    </form>
  );
}
