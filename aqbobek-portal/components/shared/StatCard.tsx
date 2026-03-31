import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  subtitle,
  icon: Icon,
  iconColor = "text-blue-500",
  iconBg = "bg-blue-50",
}: {
  label: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm font-medium text-[var(--text-secondary)]">
          {label}
        </span>
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconBg}`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
      </div>
      <div className="font-mono text-4xl leading-none font-bold text-[var(--text-primary)]">
        {value}
      </div>
      {subtitle && (
        <div className="mt-2 text-xs text-[var(--text-muted)]">{subtitle}</div>
      )}
    </div>
  );
}
