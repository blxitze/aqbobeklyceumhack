"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface Props {
  title: string;
  badge?: number;
  badgeColor?: "red" | "yellow" | "green";
  defaultOpen?: boolean;
  children: ReactNode;
}

export default function CollapsibleSection({
  title,
  badge,
  badgeColor = "red",
  defaultOpen = true,
  children,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);

  const badgeColors = {
    red: "bg-red-100 text-red-700",
    yellow: "bg-yellow-100 text-yellow-700",
    green: "bg-green-100 text-green-700",
  } as const;

  return (
    <div className="overflow-hidden rounded-lg border">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full bg-card p-4 text-left transition-colors hover:bg-muted/50"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-base font-medium">{title}</span>
            {badge !== undefined && badge > 0 ? (
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badgeColors[badgeColor]}`}>
                {badge}
              </span>
            ) : null}
          </div>
          {open ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>
      {open ? <div className="border-t p-4">{children}</div> : null}
    </div>
  );
}
