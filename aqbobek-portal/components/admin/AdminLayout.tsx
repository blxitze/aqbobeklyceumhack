"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { signOut } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AdminLayoutProps = {
  children: ReactNode;
};

const LINKS = [
  { href: "/admin/dashboard", label: "Дашборд" },
  { href: "/admin/schedule", label: "Расписание" },
  { href: "/admin/notifications", label: "Уведомления" },
];

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

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
          "absolute top-0 left-0 z-20 flex h-screen w-72 shrink-0 flex-col border-r bg-background transition-transform md:sticky md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="border-b p-4 pt-16 md:pt-4">
          <p className="text-lg font-semibold">Панель администратора</p>
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto py-4 px-4">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setIsOpen(false)}
              className={cn(
                "block rounded-md px-3 py-2 text-sm transition-colors",
                pathname === link.href
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto shrink-0 space-y-4 border-t p-4">
          <div>
            <p className="text-sm font-semibold">Администратор</p>
            <p className="text-xs text-muted-foreground">Aqbobek Lyceum</p>
          </div>
          <Button variant="outline" className="w-full" onClick={() => signOut({ redirectTo: "/login" })}>
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

      <main className="flex-1 overflow-y-auto p-4 pt-16 md:p-6 md:pt-6">{children}</main>
    </div>
  );
}
