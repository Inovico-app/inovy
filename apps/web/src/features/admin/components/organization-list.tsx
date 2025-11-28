"use server";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCachedAllOrganizations } from "@/server/cache/organization.cache";
import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { OrganizationListClient } from "./organization-list-client";

export async function OrganizationList() {
  const orgsResult = await getCachedAllOrganizations();

  if (orgsResult.isErr()) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-red-500">Failed to load organizations</p>
          <p className="text-sm text-muted-foreground mt-2">
            {orgsResult.error.message}
          </p>
        </CardContent>
      </Card>
    );
  }

  const organizations = orgsResult.value;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Organizations</CardTitle>
            <CardDescription>
              {organizations.length === 0
                ? "No organizations yet"
                : `${organizations.length} organization${organizations.length === 1 ? "" : "s"} in the system`}
            </CardDescription>
          </div>
          <Button asChild>
            <Link href="/admin/organizations/create">
              <PlusIcon className="mr-2 h-4 w-4" />
              Create Organization
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <OrganizationListClient organizations={organizations} />
      </CardContent>
    </Card>
  );
}

