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
  const organizations = await getCachedAllOrganizations();

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
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Link href={"/admin/organizations/create" as any}>
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

