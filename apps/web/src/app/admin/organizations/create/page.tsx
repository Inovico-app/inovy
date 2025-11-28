import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { OrganizationForm } from "@/features/admin/components/organization-form";
import { getAuthSession } from "@/lib/auth/auth-helpers";
import { isSuperAdmin } from "@/lib/rbac/rbac";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Create Organization",
  description: "Create a new organization",
};

export default async function CreateOrganizationPage() {
  const authResult = await getAuthSession();

  if (authResult.isErr()) {
    redirect("/sign-in");
  }

  const { user, member } = authResult.value;
  const session = { user, member };

  // Check if user is superadmin
  if (!isSuperAdmin(session)) {
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

