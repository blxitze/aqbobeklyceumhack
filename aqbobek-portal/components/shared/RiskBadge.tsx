export function RiskBadge({ level }: { level: "low" | "medium" | "high" }) {
  const styles = {
    low: { bg: "bg-[#DCFCE7] text-[#166534]", label: "Низкий риск" },
    medium: { bg: "bg-[#FEF9C3] text-[#854D0E]", label: "Средний риск" },
    high: { bg: "bg-[#FEE2E2] text-[#991B1B]", label: "Высокий риск" },
  };
  const { bg, label } = styles[level];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 
                      rounded-full text-xs font-semibold ${bg}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {label}
    </span>
  );
}
