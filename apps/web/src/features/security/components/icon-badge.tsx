import type { LucideIcon } from "lucide-react";

interface IconBadgeProps {
  icon: LucideIcon;
  className?: string;
  containerClassName?: string;
}

export function IconBadge({
  icon: Icon,
  className = "text-primary",
  containerClassName = "bg-primary/5 ring-primary/10",
}: IconBadgeProps) {
  return (
    <div
      className={`flex size-10 shrink-0 items-center justify-center rounded-lg ring-1 ${containerClassName}`}
    >
      <Icon aria-hidden="true" className={`size-5 ${className}`} />
    </div>
  );
}
