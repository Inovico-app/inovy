import type { Metadata } from "next";
import { Skeleton } from "@/components/ui/skeleton";
import { TeamsList } from "@/features/teams/components/teams-list";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Teams",
};

export default function TeamsPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Teams</h1>
          <p className="text-muted-foreground mt-2">
            View and manage your team memberships
          </p>
        </div>
        <Suspense
          fallback={
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={`skeleton-${i}`} className="h-32" />
              ))}
            </div>
          }
        >
          <TeamsList />
        </Suspense>
      </div>
    </div>
  );
}
