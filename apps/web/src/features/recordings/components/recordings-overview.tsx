import { getBetterAuthSession } from "@/lib/better-auth-session";
import { getCachedRecordingsByOrganization } from "@/server/cache/recording.cache";
import { getCachedUserProjects } from "@/server/cache/project.cache";
import { RecordingsOverviewClient } from "./recordings-overview-client";
import { getTranslations } from "next-intl/server";

export async function RecordingsOverview() {
  const t = await getTranslations("recordings");
  const authResult = await getBetterAuthSession();

  if (authResult.isErr() || !authResult.value.isAuthenticated) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">{t("page.authRequired")}</p>
      </div>
    );
  }

  const { user, organization, userTeamIds } = authResult.value;

  if (!user || !organization) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">{t("page.userOrOrgNotFound")}</p>
      </div>
    );
  }

  const organizationId = organization.id;

  // Fetch recordings and projects in parallel (both cached)
  const [recordings, projects] = await Promise.all([
    getCachedRecordingsByOrganization(organizationId, {
      user,
      userTeamIds,
    }),
    getCachedUserProjects(organizationId, {
      userTeamIds,
      user,
    }),
  ]);

  return (
    <RecordingsOverviewClient recordings={recordings} projects={projects} />
  );
}
