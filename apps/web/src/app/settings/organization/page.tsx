import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getOrganizationSettings } from "@/features/settings/actions/organization-settings";
import { OrganizationInstructionsSection } from "@/features/settings/components/organization-instructions-section";
import { getAuthSession } from "@/lib/auth";
import { isOrganizationAdmin } from "@/lib/rbac";
import { OrganizationService } from "@/server/services";
import { Building2Icon, MailIcon, UserIcon } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

async function OrganizationContent() {
  const authResult = await getAuthSession();

  if (authResult.isErr()) {
    return (
      <div className="text-center">
        <p className="text-red-500">Failed to load organization information</p>
      </div>
    );
  }

  const auth = authResult.value;
  const organization = auth.organization;

  if (!organization) {
    return (
      <div className="text-center">
        <p className="text-muted-foreground">No organization data available</p>
      </div>
    );
  }

  const orgCode =
    ((organization as unknown as Record<string, unknown>).org_code as
      | string
      | undefined) ||
    ((organization as unknown as Record<string, unknown>).code as
      | string
      | undefined);
  const orgName =
    ((organization as unknown as Record<string, unknown>).display_name as
      | string
      | undefined) ??
    ((organization as unknown as Record<string, unknown>).name as
      | string
      | undefined) ??
    "Organization";

  // Check if user is admin
  const canEdit = auth.user ? isOrganizationAdmin(auth.user) : false;

  // Fetch organization members
  let members: Array<{
    id: string;
    email: string | null;
    given_name: string | null;
    family_name: string | null;
    roles?: string[];
  }> = [];

  if (orgCode) {
    const membersResult = await OrganizationService.getOrganizationMembers(
      orgCode
    );
    if (membersResult.isOk()) {
      members = membersResult.value;
    }
  }

  // Fetch organization settings
  const settingsResult = await getOrganizationSettings();
  const instructions =
    settingsResult && settingsResult.data?.instructions
      ? settingsResult.data.instructions
      : "";

  return (
    <div className="container mx-auto max-w-2xl py-8 px-4">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Organization</h1>
        <p className="text-muted-foreground">
          View organization information and members
        </p>
      </div>

      {/* Organization Info */}
      <Card>
        <CardHeader>
          <CardTitle>Organization Details</CardTitle>
          <CardDescription>Your organization information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-4">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <Building2Icon className="h-5 w-5 text-purple-600 dark:text-purple-300" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Organization Name
              </p>
              <p className="text-lg font-semibold">{orgName}</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <UserIcon className="h-5 w-5 text-blue-600 dark:text-blue-300" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Member Count
              </p>
              <p className="text-lg font-semibold">
                {members.length} {members.length === 1 ? "member" : "members"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Instructions */}
      {orgCode && (
        <OrganizationInstructionsSection
          initialInstructions={instructions}
          organizationId={orgCode}
          canEdit={canEdit}
        />
      )}

      {/* Members List */}
      <Card>
        <CardHeader>
          <CardTitle>Organization Members</CardTitle>
          <CardDescription>
            {members.length > 0
              ? "All members in your organization"
              : "No members in this organization yet"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {members.length > 0 ? (
            <div className="space-y-3">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">
                        {member.given_name && member.family_name
                          ? `${member.given_name} ${member.family_name}`
                          : member.given_name || member.email || "Unknown"}
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
                      <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                        <MailIcon className="h-3 w-3" />
                        {member.email}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-muted-foreground">No members to display</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Back Button */}
      <Button variant="outline" asChild>
        <Link href="/settings">← Back to Settings</Link>
      </Button>
    </div>
  );
}

export default function OrganizationPage() {
  return (
    <Suspense fallback={<div>Loading organization data...</div>}>
      <OrganizationContent />
    </Suspense>
  );
}

