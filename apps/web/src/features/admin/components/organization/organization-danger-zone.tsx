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
import { Loader2Icon, TrashIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { deleteOrganization } from "../../actions/delete-organization";

interface OrganizationDangerZoneProps {
  organizationId: string;
  organizationName: string;
  memberCount: number;
}

export function OrganizationDangerZone({
  organizationId,
  organizationName,
  memberCount,
}: OrganizationDangerZoneProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteOrganization({ id: organizationId });

      if (result?.data) {
        toast.success("Organization deleted successfully");
        router.push("/admin/organizations");
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
    <Card className="border-destructive/50 bg-destructive/5">
      <CardHeader>
        <CardTitle className="text-destructive flex items-center gap-2">
          <TrashIcon className="h-5 w-5" />
          Danger Zone
        </CardTitle>
        <CardDescription>
          Permanently delete this organization and all associated data. This
          action cannot be undone.
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
                organization <strong>{organizationName}</strong> and remove all
                associated data including{" "}
                <strong>
                  {memberCount} member{memberCount === 1 ? "" : "s"}
                </strong>
                .
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
  );
}

