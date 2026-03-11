import { Loader2 } from "lucide-react";

interface LoaderProps {
  label?: string;
}

export function Loader({ label = "Laden..." }: LoaderProps) {
  return (
    <div
      className="flex h-full items-center justify-center pt-8"
      role="status"
      aria-busy="true"
      aria-label={label}
    >
      <Loader2 className="animate-spin" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </div>
  );
}

