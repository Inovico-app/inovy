import Link from "next/link";
import { Suspense } from "react";
import { HeaderAuthButtons } from "./header-auth-buttons";
import { HeaderNavigation } from "./header-navigation";
import { ModeToggle } from "./mode-toggle";

export function Header() {
  return (
    <div>
      <div className="flex flex-row items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-semibold text-xl">
            Inovy
          </Link>
          <Suspense fallback={null}>
            <HeaderNavigation />
          </Suspense>
        </div>
        <div className="flex items-center gap-3">
          <Suspense
            fallback={
              <div className="h-9 w-16 bg-muted animate-pulse rounded" />
            }
          >
            <HeaderAuthButtons />
          </Suspense>
          <ModeToggle />
        </div>
      </div>
      <hr />
    </div>
  );
}

