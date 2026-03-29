"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { Menu, X } from "lucide-react";
import { signOut } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type TeacherLayoutProps = {
  children: ReactNode;
  teacherName: string;
  subjects: string[];
  firstClassId: string | null;
};

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export default function TeacherLayout({
  children,
  teacherName,
  subjects,
  firstClassId,
}: TeacherLayoutProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const teacherInitials = useMemo(() => initials(teacherName), [teacherName]);
  const classesHref = firstClassId ? `/teacher/class/${firstClassId}` : "/teacher/dashboard";
  const navLinks = [
    { href: "/teacher/dashboard", label: "Дашборд" },
    { href: classesHref, label: "Мои классы" },
    { href: "/teacher/reports", label: "Отчёты" },
  ];

  return (
    <div className="flex min-h-screen bg-muted/20">
      <Button
        variant="outline"
        size="icon"
        className="fixed top-4 left-4 z-30 md:hidden"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        {isOpen ? <X /> : <Menu />}
      </Button>

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-20 flex w-72 flex-col border-r bg-background p-4 transition-transform md:static md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <p className="mt-12 text-lg font-semibold md:mt-0">Панель учителя</p>

        <nav className="mt-6 space-y-2">
          {navLinks.map((link) => {
            const isActive = pathname === link.href || (link.href.includes("/teacher/class/") && pathname.startsWith("/teacher/class"));
            return (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className={cn(
                  "block rounded-md px-3 py-2 text-sm transition-colors",
                  isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto space-y-4 rounded-lg border p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
              {teacherInitials}
            </div>
            <div>
              <p className="text-sm font-semibold">{teacherName}</p>
              <p className="max-w-44 truncate text-xs text-muted-foreground">
                {subjects.length > 0 ? subjects.join(", ") : "Предметы не указаны"}
              </p>
            </div>
          </div>
          <Button variant="outline" className="w-full" onClick={() => signOut({ redirectTo: "/login" })}>
            Выйти
          </Button>
        </div>
      </aside>

      {isOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-10 bg-black/30 md:hidden"
          aria-label="Закрыть меню"
          onClick={() => setIsOpen(false)}
        />
      ) : null}

      <main className="flex-1 p-4 pt-16 md:p-6 md:pt-6">{children}</main>
    </div>
  );
}
