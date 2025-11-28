"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { OrganizationDetailDto } from "@/server/cache/organization.cache";
import { format } from "date-fns";
import { Building2Icon, CalendarIcon, Loader2Icon, TrashIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { deleteOrganization } from "../actions/delete-organization";

interface OrganizationDetailProps {
  organization: OrganizationDetailDto;
  memberCount: number;
}

export function OrganizationDetail({
  organization,
  memberCount,
}: OrganizationDetailProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteOrganization({ id: organization.id });

      if (result?.data) {
        toast.success("Organization deleted successfully");
        router.push("/admin/organizations");
      } else if (result?.validationError) {
        toast.error(result.validationError);
      } else if (result?.serverError) {
        toast.error(result.serverError);
      }
    } catch (error) {
      toast.error("Failed to delete organization");
      console.error(error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Organization Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Organization Information</CardTitle>
          <CardDescription>
            Basic details about this organization
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            {organization.logo ? (
              <img
                src={organization.logo}
                alt={organization.name}
                className="h-16 w-16 rounded-lg object-cover"
              />
            ) : (
              <div className="h-16 w-16 rounded-lg bg-primary/10 flex items-center justify-center">
                <Building2Icon className="h-8 w-8 text-primary" />
              </div>
            )}
            <div>
              <h2 className="text-2xl font-bold">{organization.name}</h2>
              <code className="text-sm text-muted-foreground bg-muted px-2 py-1 rounded">
                {organization.slug}
              </code>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center gap-3 p-4 border rounded-lg">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Building2Icon className="h-5 w-5 text-blue-600 dark:text-blue-300" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Members
                </p>
                <p className="text-2xl font-bold">{memberCount}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 border rounded-lg">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <CalendarIcon className="h-5 w-5 text-green-600 dark:text-green-300" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Created
                </p>
                <p className="text-lg font-semibold">
                  {format(new Date(organization.createdAt), "MMM d, yyyy")}
                </p>
              </div>
            </div>
          </div>

          {organization.logo && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">
                Logo URL
              </p>
              <code className="text-sm bg-muted px-3 py-2 rounded block break-all">
                {organization.logo}
              </code>
            </div>
          )}

          {organization.metadata && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">
                Metadata
              </p>
              <code className="text-sm bg-muted px-3 py-2 rounded block break-all">
                {organization.metadata}
              </code>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-200 dark:border-red-900">
        <CardHeader>
          <CardTitle className="text-red-600 dark:text-red-400">
            Danger Zone
          </CardTitle>
          <CardDescription>
            Permanently delete this organization and all associated data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <TrashIcon className="mr-2 h-4 w-4" />
                )}
                Delete Organization
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the
                  organization <strong>{organization.name}</strong> and remove
                  all associated data including{" "}
                  <strong>{memberCount} member{memberCount === 1 ? "" : "s"}</strong>.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Delete Organization
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}

