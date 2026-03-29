import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = {
  title: "Organization Settings",
  description: "Manage your organization, members, and knowledge base",
};
import { InviteUserDialog } from "@/features/admin/components/organization/invite-user-dialog";
import { OrganizationDangerZone } from "@/features/admin/components/organization/organization-danger-zone";
import { TeamManagement } from "@/features/admin/components/team/team-management";
import { OrganizationKnowledgeBaseSection } from "@/features/knowledge-base/components/organization-knowledge-base-section";
import { getOrganizationSettings } from "@/features/settings/actions/organization-settings";
import { OrganizationInstructionsSection } from "@/features/settings/components/organization-instructions-section";
import { OrganizationTabs } from "@/features/settings/components/organization-tabs";
import { formatDateShort } from "@/lib/formatters/date-formatters";
import { getUserDisplayName } from "@/lib/formatters/display-formatters";
import { logger } from "@/lib/logger";
import { isAdmin } from "@/lib/permissions/presets";
import { requirePermission } from "@/lib/permissions/require-permission";
import {
  getCachedKnowledgeDocuments,
  getCachedKnowledgeEntries,
} from "@/server/cache/knowledge-base.cache";
import { OrganizationQueries } from "@/server/data-access/organization.queries";
import { OrganizationService } from "@/server/services/organization.service";
import { Building2Icon, ClockIcon, MailIcon, UsersIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

async function OrganizationContent() {
  const t = await getTranslations("settings.organization");
  const { organizationId } = await requirePermission(isAdmin);

  const canEdit = true;

  // Parallel data fetching
  const [
    [membersResult, invitationsResult],
    settingsResult,
    [knowledgeEntries, knowledgeDocuments],
    orgRecord,
  ] = await Promise.all([
    Promise.all([
      OrganizationService.getOrganizationMembers(organizationId),
      OrganizationService.getPendingInvitations(organizationId),
    ]),
    getOrganizationSettings(),
    Promise.all([
      getCachedKnowledgeEntries("organization", organizationId).catch(
        (error) => {
          logger.error("Failed to fetch knowledge entries", {
            component: "OrganizationPage",
            organizationId,
            error: error instanceof Error ? error : new Error(String(error)),
          });
          return [];
        },
      ),
      getCachedKnowledgeDocuments("organization", organizationId).catch(
        (error) => {
          logger.error("Failed to fetch knowledge documents", {
            component: "OrganizationPage",
            organizationId,
            error: error instanceof Error ? error : new Error(String(error)),
          });
          return [];
        },
      ),
    ]),
    canEdit
      ? OrganizationQueries.findByIdDirect(organizationId).catch((error) => {
          logger.error("Failed to fetch organization record", {
            component: "OrganizationPage",
            organizationId,
            error: error instanceof Error ? error : new Error(String(error)),
          });
          return null;
        })
      : Promise.resolve(null),
  ]);

  const members = membersResult.isOk() ? membersResult.value : [];
  const pendingInvitations = invitationsResult.isOk()
    ? invitationsResult.value
    : [];
  const instructions =
    settingsResult && settingsResult.data?.instructions
      ? settingsResult.data.instructions
      : "";
  const orgName = orgRecord?.name ?? "Organization";

  // Tab content: General
  const generalContent = (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium">
          {t("organizationDetails")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <Building2Icon className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-sm text-muted-foreground">
              {t("organizationName")}
            </p>
            <p className="text-sm font-medium">{orgName}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <UsersIcon className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-sm text-muted-foreground">{t("members")}</p>
            <p className="text-sm font-medium">
              {members.length} {members.length === 1 ? "member" : "members"}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Tab content: Members & Teams
  const membersContent = (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium">
              {t("members")}
            </CardTitle>
            {canEdit && <InviteUserDialog />}
          </div>
        </CardHeader>
        <CardContent>
          {members.length > 0 ? (
            <div className="space-y-2">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">
                        {getUserDisplayName({
                          email: member.email,
                          given_name: member.given_name,
                          family_name: member.family_name,
                        })}
                      </p>
                      {member.roles && member.roles.length > 0 && (
                        <div className="flex gap-1">
                          {member.roles.map((role) => (
                            <Badge
                              key={role}
                              variant="outline"
                              className="text-xs"
                            >
                              {role}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    {member.email && (
                      <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
                        <MailIcon className="h-3 w-3" />
                        {member.email}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No members to display
            </p>
          )}

          {pendingInvitations.length > 0 && (
            <div className="mt-6">
              <p className="text-sm font-medium text-muted-foreground mb-3">
                {t("pendingInvitations", { count: pendingInvitations.length })}
              </p>
              <div className="space-y-2">
                {pendingInvitations.map((invitation) => (
                  <div
                    key={invitation.id}
                    className="flex items-center justify-between p-3 border border-dashed rounded-lg bg-muted/25"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-muted-foreground">
                          {invitation.email}
                        </p>
                        <Badge
                          variant="outline"
                          className="text-xs border-amber-500/50 text-amber-600 dark:text-amber-400"
                        >
                          Pending
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {invitation.role}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
                        <ClockIcon className="h-3 w-3" />
                        {t("expires", {
                          date: formatDateShort(invitation.expiresAt),
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <TeamManagement />
    </div>
  );

  // Tab content: AI & Knowledge Base
  const aiContent = (
    <div className="space-y-6">
      <OrganizationInstructionsSection
        initialInstructions={instructions}
        organizationId={organizationId}
        canEdit={canEdit}
      />
      <OrganizationKnowledgeBaseSection
        canEdit
        initialEntries={knowledgeEntries}
        initialDocuments={knowledgeDocuments}
        organizationId={organizationId}
      />
    </div>
  );

  const scheduledDeletionAt = orgRecord?.scheduledDeletionAt ?? null;

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      {/* Outer Suspense (in OrganizationPage) satisfies nuqs useSearchParams requirement */}
      <OrganizationTabs
        generalContent={generalContent}
        membersContent={membersContent}
        aiContent={aiContent}
      />
      {canEdit && (
        <div className="mt-6">
          <OrganizationDangerZone
            organizationId={organizationId}
            organizationName={orgName}
            scheduledDeletionAt={scheduledDeletionAt}
          />
        </div>
      )}
    </>
  );
}

export default function OrganizationPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-muted rounded animate-pulse" />
            <div className="h-4 w-72 bg-muted rounded animate-pulse" />
          </div>
          <div className="h-10 w-full bg-muted rounded animate-pulse" />
          <div className="h-64 bg-muted rounded animate-pulse" />
        </div>
      }
    >
      <OrganizationContent />
    </Suspense>
  );
}
