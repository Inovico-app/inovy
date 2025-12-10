import { cn } from "@/lib/utils";
import { AuthMarketingPanel } from "./auth-marketing-panel";

interface AuthShellProps {
  children: React.ReactNode;
  className?: string;
}

export function AuthShell({ children, className }: AuthShellProps) {
  return (
    <div className="flex min-h-screen">
      {/* Left Panel - Auth Form */}
      <div
        className={cn(
          "flex w-full flex-col bg-background dark:bg-card lg:w-1/2",
          className
        )}
      >
        <div className="flex flex-1 flex-col justify-center px-6 py-12 sm:px-12">
          <div className="mx-auto w-full max-w-md">{children}</div>
        </div>
      </div>

      {/* Right Panel - Marketing */}
      <AuthMarketingPanel />
    </div>
  );
}

