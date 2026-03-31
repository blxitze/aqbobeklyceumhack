"use client";

const GRADIENTS = [
  "from-blue-500 to-purple-600",
  "from-emerald-500 to-teal-600",
  "from-orange-500 to-red-500",
  "from-pink-500 to-rose-600",
  "from-violet-500 to-indigo-600",
];

export function Avatar({
  name,
  size = "md",
}: {
  name: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
}) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const gradient = GRADIENTS[name.charCodeAt(0) % GRADIENTS.length];
  const sizes = {
    xs: "w-6 h-6 text-[10px]",
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-14 h-14 text-lg",
    xl: "w-20 h-20 text-2xl",
  };
  return (
    <div
      className={`rounded-full bg-gradient-to-br ${gradient} ${sizes[size]} 
                     flex items-center justify-center font-semibold text-white 
                     shrink-0 select-none`}
    >
      {initials}
    </div>
  );
}
