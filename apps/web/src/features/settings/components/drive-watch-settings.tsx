import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getAuthSession } from "@/lib/auth/auth-helpers";
import { getCachedDriveWatches } from "@/server/cache/drive-watch.cache";
import { getCachedUserProjects } from "@/server/cache/project.cache";
import { Suspense } from "react";
import { DriveWatchSettingsClient } from "./drive-watch-settings-client";

/**
 * Drive Watch Settings Component (Server Component)
 * Fetches data using Next.js 16 cache components functionality
 */
export async function DriveWatchSettings() {
  // Get auth session (outside cache)
  const authResult = await getAuthSession();

  if (
    authResult.isErr() ||
    !authResult.value.isAuthenticated ||
    !authResult.value.user
  ) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Google Drive Folder Monitoring</CardTitle>
          <CardDescription>
            Please sign in to manage Drive folder monitoring.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const userId = authResult.value.user.id;

  // Fetch watches and projects using cached functions
  const watches = await getCachedDriveWatches(userId);
  const projects = await getCachedUserProjects();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Google Drive Folder Monitoring</CardTitle>
        <CardDescription>
          Monitor Google Drive folders for automatic file processing. When audio
          or video files are uploaded to watched folders, they will be
          automatically processed and converted to recordings with AI insights.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Suspense fallback={<DriveWatchSettingsSkeleton />}>
          <DriveWatchSettingsClient watches={watches} projects={projects} />
        </Suspense>
      </CardContent>
    </Card>
  );
}

function DriveWatchSettingsSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}

