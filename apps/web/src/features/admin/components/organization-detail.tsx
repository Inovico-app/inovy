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
import Image from "next/image";
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        router.push("/admin/organizations" as any);
      } else if (result?.validationErrors) {
        const errors = Object.values(result.validationErrors)
          .flat()
          .filter((e): e is string => typeof e === "string");
        toast.error(errors[0] || "Validation error");
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
              <div className="relative h-16 w-16 rounded-lg overflow-hidden">
                <Image
                  src={organization.logo}
                  alt={organization.name}
                  fill
                  className="object-cover"
                />
              </div>
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

          <div className="grid gap-6 md:grid-cols-3">
            <div className="group relative overflow-hidden rounded-xl border bg-gradient-to-br from-background to-muted/20 p-6 transition-all hover:shadow-md">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Total Members
                  </p>
                  <p className="text-3xl font-bold tracking-tight">{memberCount}</p>
                  <p className="text-xs text-muted-foreground">
                    Active users
                  </p>
                </div>
                <div className="rounded-lg bg-primary/10 p-3 ring-1 ring-primary/20">
                  <Building2Icon className="h-5 w-5 text-primary" />
                </div>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-xl border bg-gradient-to-br from-background to-muted/20 p-6 transition-all hover:shadow-md">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Created Date
                  </p>
                  <p className="text-xl font-semibold">
                    {format(new Date(organization.createdAt), "MMM d, yyyy")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(organization.createdAt), "h:mm a")}
                  </p>
                </div>
                <div className="rounded-lg bg-secondary/50 p-3 ring-1 ring-border">
                  <CalendarIcon className="h-5 w-5 text-secondary-foreground" />
                </div>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-xl border bg-gradient-to-br from-background to-muted/20 p-6 transition-all hover:shadow-md">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Organization ID
                  </p>
                  <p className="text-sm font-mono break-all">
                    {organization.id.slice(0, 8)}...
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Unique identifier
                  </p>
                </div>
                <div className="rounded-lg bg-accent p-3 ring-1 ring-border">
                  <Building2Icon className="h-5 w-5 text-accent-foreground" />
                </div>
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
      <Card className="border-destructive/50 bg-destructive/5">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2">
            <TrashIcon className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            Permanently delete this organization and all associated data. This action cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                disabled={isDeleting}
                className="gap-2"
              >
                {isDeleting ? (
                  <>
                    <Loader2Icon className="h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <TrashIcon className="h-4 w-4" />
                    Delete Organization
                  </>
                )}
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
                  className="bg-destructive hover:bg-destructive/90"
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

