import { ProtectedPage } from "@/components/protected-page";
import { RecordingsOverview } from "@/features/recordings/components/recordings-overview";
import { Suspense } from "react";

export default async function RecordingsPage() {
  // CACHE COMPONENTS: Wrap dynamic content in Suspense to enable static shell generation
  // RecordingsOverview accesses auth data and recordings, making it dynamic
  return (
    <Suspense
      fallback={
        <div className="container mx-auto py-8 px-4">
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="h-12 bg-muted rounded animate-pulse" />
            <div className="h-64 bg-muted rounded animate-pulse" />
          </div>
        </div>
      }
    >
      <ProtectedPage>
        <div className="container mx-auto py-8 px-4">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-foreground">
                All Recordings
              </h1>
              <p className="text-muted-foreground mt-2">
                View and manage all recordings across all projects in your
                organization
              </p>
            </div>

            {/* Recordings Overview */}
            <RecordingsOverview />
          </div>
        </div>
      </ProtectedPage>
    </Suspense>
  );
}

