"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useState } from "react";
import { BarChart3, Bell, Calendar, LayoutDashboard, LogOut, Menu, Monitor, X } from "lucide-react";
import { signOut } from "next-auth/react";

import { Avatar } from "@/components/shared/Avatar";
import PusherNotificationBanner from "@/components/shared/PusherNotificationBanner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AdminLayoutProps = {
  children: ReactNode;
  adminName: string;
  userEmail?: string | null;
};

const LINKS = [
  { href: "/admin/dashboard", label: "Главная", icon: LayoutDashboard },
  { href: "/admin/schedule", label: "Расписание", icon: Calendar },
  { href: "/admin/notifications", label: "Уведомления", icon: Bell },
  { href: "/admin/dashboard", label: "Аналитика", icon: BarChart3 },
  { href: "/kiosk", label: "Стенгазета", icon: Monitor, target: "_blank" as const },
];

export default function AdminLayout({ children, adminName, userEmail }: AdminLayoutProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[var(--bg)]">
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
          "absolute top-0 left-0 z-20 flex w-64 h-screen shrink-0 flex-col bg-[#0F172A] transition-transform md:sticky md:top-0 md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center gap-3 border-b border-white/10 px-6 py-5 pt-16 md:pt-5">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500 text-lg font-bold text-white"
            style={{ fontFamily: "Plus Jakarta Sans" }}
          >
            A
          </div>
          <div>
            <div
              className="text-sm leading-tight font-semibold text-white"
              style={{ fontFamily: "Plus Jakarta Sans" }}
            >
              Aqbobek Lyceum
            </div>
            <div className="text-xs text-slate-500">Администратор</div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto py-4">
          {LINKS.map((link) => {
            const isExternal = link.href === "/kiosk";
            const isActive = pathname === link.href;
            const Icon = link.icon;
            return (
              <Link
                key={`${link.href}-${link.label}`}
                href={link.href}
                target={link.target}
                rel={isExternal ? "noopener noreferrer" : undefined}
                onClick={() => setIsOpen(false)}
                className={cn(
                  "flex items-center gap-3 mx-2 px-4 py-2.5 rounded-lg border-l-4 text-sm transition-colors",
                  isActive
                    ? "border-blue-500 bg-blue-500/10 text-white font-medium"
                    : "border-transparent text-slate-400 hover:text-white hover:bg-white/5",
                )}
              >
                <Icon className="h-4 w-4" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-white/10 px-4 py-4">
          <div className="flex items-center gap-3">
            <Avatar name={adminName} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-white">{adminName}</div>
              <div className="truncate text-xs text-slate-500">{userEmail ?? "admin@aqbobek.kz"}</div>
            </div>
          </div>
        </div>
        <button
          onClick={() => signOut()}
          className="flex items-center gap-3 px-4 py-3 mx-2 mb-2 rounded-lg
             text-slate-400 hover:text-white hover:bg-red-500/10 
             hover:text-red-400 transition-colors w-full text-sm"
        >
          <LogOut className="w-4 h-4" />
          Выйти из аккаунта
        </button>
      </aside>

      {isOpen ? (
        <button
          type="button"
          aria-label="Закрыть меню"
          className="fixed inset-0 z-10 bg-black/30 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      ) : null}

      <main className="flex-1 overflow-y-auto p-4 pt-16 md:p-6 md:pt-6">
        <PusherNotificationBanner />
        {children}
      </main>
    </div>
  );
}
