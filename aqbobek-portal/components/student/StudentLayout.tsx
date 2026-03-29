"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { Menu, X } from "lucide-react";
import { signOut } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type StudentLayoutProps = {
  children: ReactNode;
  studentName: string;
  className: string;
};

const NAV_LINKS = [
  { href: "/student/dashboard", label: "Дашборд" },
  { href: "/student/schedule", label: "Расписание" },
  { href: "/student/portfolio", label: "Портфолио" },
  { href: "/student/leaderboard", label: "Лидерборд" },
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}

export default function StudentLayout({ children, studentName, className }: StudentLayoutProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const initials = useMemo(() => getInitials(studentName), [studentName]);

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
        <div className="mt-12 md:mt-0">
          <p className="text-lg font-semibold">Панель студента</p>
        </div>

        <nav className="mt-6 space-y-2">
          {NAV_LINKS.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
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
              {initials}
            </div>
            <div>
              <p className="text-sm font-semibold">{studentName}</p>
              <p className="text-xs text-muted-foreground">{className}</p>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => signOut({ redirectTo: "/login" })}
          >
            Выйти
          </Button>
        </div>
      </aside>

      {isOpen ? (
        <button
          type="button"
          aria-label="Закрыть меню"
          className="fixed inset-0 z-10 bg-black/30 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      ) : null}

      <main className="flex-1 p-4 pt-16 md:p-6 md:pt-6">{children}</main>
    </div>
  );
}
