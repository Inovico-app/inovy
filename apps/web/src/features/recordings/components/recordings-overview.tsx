import { getAuthSession } from "@/lib/auth";
import { getCachedRecordingsByOrganization } from "@/server/cache/recording.cache";
import { ProjectService } from "@/server/services/project.service";
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

  // Fetch recordings and projects in parallel
  const [recordings, projectsResult] = await Promise.all([
    getCachedRecordingsByOrganization(organizationId),
    ProjectService.getProjectsByOrganization({
      organizationId: organizationId,
      status: "active",
    }),
  ]);

  const projects =
    projectsResult.isOk() ? projectsResult.value : [];

  return (
    <RecordingsOverviewClient
      recordings={recordings}
      projects={projects.map((p) => ({ id: p.id, name: p.name }))}
    />
  );
}

