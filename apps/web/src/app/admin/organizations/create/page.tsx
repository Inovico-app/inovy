import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { OrganizationForm } from "@/features/admin/components/organization-form";
import { Permissions } from "@/lib/rbac/permissions";
import { checkPermission } from "@/lib/rbac/permissions-server";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export const metadata = {
  title: "Create Organization",
  description: "Create a new organization",
};

async function CreateOrganizationContent() {
  const hasCreateOrganizationPermission = await checkPermission(
    Permissions.organization.create
  );

  if (!hasCreateOrganizationPermission) {
    redirect("/");
  }

  return (
    <div className="container mx-auto max-w-2xl py-8 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Create Organization</h1>
        <p className="text-muted-foreground">
          Create a new organization for users to join
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Organization Details</CardTitle>
          <CardDescription>
            Enter the details for the new organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OrganizationForm />
        </CardContent>
      </Card>
    </div>
  );
}

export default function CreateOrganizationPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto max-w-2xl py-8 px-4">
          <div className="mb-6">
            <div className="h-9 bg-muted rounded w-64 animate-pulse mb-2" />
            <div className="h-5 bg-muted rounded w-96 animate-pulse" />
          </div>
          <Card>
            <CardHeader>
              <div className="h-7 bg-muted rounded w-48 animate-pulse mb-2" />
              <div className="h-5 bg-muted rounded w-80 animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="h-20 bg-muted rounded animate-pulse" />
                <div className="h-20 bg-muted rounded animate-pulse" />
                <div className="h-20 bg-muted rounded animate-pulse" />
              </div>
            </CardContent>
          </Card>
        </div>
      }
    >
      <CreateOrganizationContent />
    </Suspense>
  );
}

