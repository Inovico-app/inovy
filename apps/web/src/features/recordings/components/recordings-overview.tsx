import { getAuthSession } from "@/lib/auth/auth-helpers";
import { getCachedRecordingsByOrganization } from "@/server/cache/recording.cache";
import { getCachedUserProjects } from "@/server/cache/project.cache";
import { RecordingsOverviewClient } from "./recordings-overview-client";

export async function RecordingsOverview() {
  const authResult = await getAuthSession();

  if (authResult.isErr() || !authResult.value.isAuthenticated) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">Authentication required</p>
      </div>
    );
  }

  const { user, organization } = authResult.value;

  if (!user || !organization) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">User or organization not found</p>
      </div>
    );
  }

  const organizationId = organization.id;

  // Fetch recordings and projects in parallel (both cached)
  const [recordings, projects] = await Promise.all([
    getCachedRecordingsByOrganization(organizationId),
    getCachedUserProjects(organizationId),
  ]);

  return (
    <RecordingsOverviewClient
      recordings={recordings}
      projects={projects}
    />
  );
}

