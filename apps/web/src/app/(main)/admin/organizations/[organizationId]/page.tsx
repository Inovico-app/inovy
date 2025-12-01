import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { OrganizationDangerZone } from "@/features/admin/components/organization/organization-danger-zone";
import { OrganizationDetail } from "@/features/admin/components/organization/organization-detail";
import { OrganizationEditForm } from "@/features/admin/components/organization/organization-edit-form";
import { OrganizationMembersList } from "@/features/admin/components/organization/organization-members-list";
import { Permissions } from "@/lib/rbac/permissions";
import { checkPermission } from "@/lib/rbac/permissions-server";
import {
  getCachedOrganizationById,
  getCachedOrganizationMembers,
} from "@/server/cache/organization.cache";
import { ArrowLeftIcon } from "lucide-react";
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
  const [organization, members] = await Promise.all([
    getCachedOrganizationById(organizationId),
    getCachedOrganizationMembers(organizationId),
  ]);

  if (!organization) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground">Organization not found</p>
        </CardContent>
      </Card>
    );
  }

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
      <OrganizationMembersList members={members} />

      {/* Danger Zone */}
      <OrganizationDangerZone
        organizationId={organization.id}
        organizationName={organization.name}
        memberCount={members.length}
      />
    </div>
  );
}

async function OrganizationPageContent({ params }: OrganizationPageProps) {
  // Check if user has superadmin permissions
  const hasSuperAdminPermission = await checkPermission(
    Permissions.superadmin.all
  );

  if (!hasSuperAdminPermission) {
    redirect("/");
  }

  const { organizationId } = await params;

  return (
    <div className="container mx-auto max-w-5xl py-8 px-4">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Organization Details</h1>
          <p className="text-muted-foreground">
            View and manage organization settings
          </p>
        </div>
        <Button variant="ghost" size="icon" className="w-fit px-4" asChild>
          <Link href="/admin/organizations">
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            Back to organizations
          </Link>
        </Button>
      </div>

      <Suspense
        fallback={
          <div className="space-y-6">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        }
      >
        <OrganizationContent organizationId={organizationId} />
      </Suspense>
    </div>
  );
}

export default function OrganizationPage(props: OrganizationPageProps) {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto max-w-5xl py-8 px-4">
          <div className="mb-8 flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded" />
            <div className="space-y-2">
              <Skeleton className="h-9 w-64" />
              <Skeleton className="h-5 w-80" />
            </div>
          </div>
          <div className="space-y-6">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      }
    >
      <OrganizationPageContent {...props} />
    </Suspense>
  );
}

