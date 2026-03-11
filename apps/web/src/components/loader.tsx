import { Loader2 } from "lucide-react";

export function Loader() {
  return (
    <div
      className="flex h-full items-center justify-center pt-8"
      role="status"
      aria-busy="true"
      aria-label="Loading"
    >
      <Loader2 className="animate-spin" aria-hidden="true" />
      <span className="sr-only">Loading...</span>
    </div>
  );
}

