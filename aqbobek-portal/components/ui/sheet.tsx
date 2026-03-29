"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type SheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
};

type SheetContentProps = {
  children: ReactNode;
  className?: string;
};

function Sheet({ open, onOpenChange, children }: SheetProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Закрыть окно"
        className="absolute inset-0 bg-black/40"
        onClick={() => onOpenChange(false)}
      />
      {children}
    </div>
  );
}

function SheetContent({ children, className }: SheetContentProps) {
  return (
    <div
      className={cn(
        "absolute top-0 right-0 h-full w-full max-w-2xl overflow-y-auto border-l bg-background p-6 shadow-xl",
        className,
      )}
    >
      {children}
    </div>
  );
}

function SheetHeader({ children }: { children: ReactNode }) {
  return <div className="mb-4 space-y-1">{children}</div>;
}

function SheetTitle({ children }: { children: ReactNode }) {
  return <h2 className="text-xl font-semibold">{children}</h2>;
}

function SheetDescription({ children }: { children: ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

export { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle };
