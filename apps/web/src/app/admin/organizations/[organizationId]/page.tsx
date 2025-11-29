import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { OrganizationDetail } from "@/features/admin/components/organization-detail";
import { OrganizationEditForm } from "@/features/admin/components/organization-edit-form";
import { getAuthSession } from "@/lib/auth/auth-helpers";
import { Permissions } from "@/lib/rbac/permissions";
import { checkPermission } from "@/lib/rbac/permissions-server";
import {
  getCachedOrganizationById,
  getCachedOrganizationMembers,
} from "@/server/cache/organization.cache";
import { ArrowLeftIcon, MailIcon } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

interface OrganizationPageProps {
  params: Promise<{
    organizationId: string;
  }>;
}

async function OrganizationContent({
  organizationId,
}: {
  organizationId: string;
}) {
  // Fetch organization and members
  const [orgResult, membersResult] = await Promise.all([
    getCachedOrganizationById(organizationId),
    getCachedOrganizationMembers(organizationId),
  ]);

  if (orgResult.isErr()) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-red-500">Failed to load organization</p>
          <p className="text-sm text-muted-foreground mt-2">
            {orgResult.error.message}
          </p>
        </CardContent>
      </Card>
    );
  }

  const organization = orgResult.value;

  if (!organization) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground">Organization not found</p>
        </CardContent>
      </Card>
    );
  }

  const members = membersResult.isOk() ? membersResult.value : [];

  return (
    <div className="space-y-6">
      {/* Organization Detail */}
      <OrganizationDetail
        organization={organization}
        memberCount={members.length}
      />

      {/* Edit Form */}
      <OrganizationEditForm organization={organization} />

      {/* Members List */}
      <Card>
        <CardHeader>
          <CardTitle>Organization Members</CardTitle>
          <CardDescription>
            {members.length > 0
              ? `${members.length} member${members.length === 1 ? "" : "s"} in this organization`
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
                          : (member.given_name ?? member.email ?? "Unknown")}
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
    </div>
  );
}

export default async function OrganizationPage({
  params,
}: OrganizationPageProps) {
  const authResult = await getAuthSession();

  if (authResult.isErr()) {
    redirect("/sign-in");
  }

  const { user } = authResult.value;
  
  if (!user) {
    redirect("/sign-in");
  }

  // Check if user has superadmin permissions
  const hasSuperAdminPermission = await checkPermission(
    Permissions.superadmin.all
  );

  if (!hasSuperAdminPermission) {
    redirect("/");
  }

  const { organizationId } = await params;

  return (
    <div className="container mx-auto max-w-4xl py-8 px-4">
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <Link href={"/admin/organizations" as any}>
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Organization Details</h1>
          <p className="text-muted-foreground">
            View and manage organization settings
          </p>
        </div>
      </div>

      <Suspense
        fallback={
          <div className="text-center py-8">Loading organization...</div>
        }
      >
        <OrganizationContent organizationId={organizationId} />
      </Suspense>
    </div>
  );
}

