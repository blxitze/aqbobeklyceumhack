"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const TYPE_OPTIONS = [
  { value: "ACHIEVEMENT" as const, label: "Достижение" },
  { value: "CERTIFICATE" as const, label: "Сертификат" },
  { value: "OLYMPIAD" as const, label: "Олимпиада" },
  { value: "OTHER" as const, label: "Проект" },
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
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-[var(--border)] bg-white p-6 shadow-sm"
    >
      <h3
        className="mb-6 text-lg font-semibold text-[var(--text-primary)]"
        style={{ fontFamily: "Plus Jakarta Sans" }}
      >
        Добавить достижение
      </h3>

      <div className="space-y-4">
        <div>
          <Label
            htmlFor="portfolio-title"
            className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]"
          >
            Название
          </Label>
          <Input
            id="portfolio-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={200}
            placeholder="Например: Региональная олимпиада"
            className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <Label
            htmlFor="portfolio-desc"
            className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]"
          >
            Описание
          </Label>
          <textarea
            id="portfolio-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={2000}
            rows={3}
            className="w-full resize-none rounded-lg border border-[var(--border)] px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            placeholder="Кратко опишите достижение"
          />
        </div>

        <div>
          <Label
            htmlFor="portfolio-type"
            className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]"
          >
            Тип
          </Label>
          <select
            id="portfolio-type"
            value={type}
            onChange={(e) => setType(e.target.value as PortfolioType)}
            className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            {TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <input type="hidden" value={date} readOnly />
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-blue-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:opacity-60"
        >
          {pending ? "Сохранение..." : "Добавить достижение"}
        </button>
      </div>
    </form>
  );
}
