"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  assignSuperadminRole,
  revokeSuperadminRole,
} from "@/features/admin/actions/superadmin-management";
import { ShieldPlusIcon, ShieldXIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface SuperadminManagementProps {
  isSuperAdmin: boolean;
}

export function SuperadminManagement({
  isSuperAdmin,
}: SuperadminManagementProps) {
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [isRevokeOpen, setIsRevokeOpen] = useState(false);
  const [isAssignLoading, setIsAssignLoading] = useState(false);
  const [isRevokeLoading, setIsRevokeLoading] = useState(false);

  const [assignForm, setAssignForm] = useState({
    userId: "",
    userEmail: "",
    justification: "",
  });

  const [revokeForm, setRevokeForm] = useState({
    userId: "",
    userEmail: "",
    justification: "",
  });

  const handleAssignSuperadmin = async () => {
    if (!assignForm.userId || !assignForm.userEmail || !assignForm.justification) {
      toast.error("All fields are required");
      return;
    }

    setIsAssignLoading(true);
    try {
      const result = await assignSuperadminRole(assignForm);

      if (result?.data) {
        toast.success("Superadmin role assigned successfully");
        setIsAssignOpen(false);
        setAssignForm({ userId: "", userEmail: "", justification: "" });
      } else {
        toast.error(result?.serverError ?? "Failed to assign superadmin role");
      }
    } catch (error) {
      toast.error("Failed to assign superadmin role");
    } finally {
      setIsAssignLoading(false);
    }
  };

  const handleRevokeSuperadmin = async () => {
    if (!revokeForm.userId || !revokeForm.userEmail || !revokeForm.justification) {
      toast.error("All fields are required");
      return;
    }

    setIsRevokeLoading(true);
    try {
      const result = await revokeSuperadminRole(revokeForm);

      if (result?.data) {
        toast.success("Superadmin role revoked successfully");
        setIsRevokeOpen(false);
        setRevokeForm({ userId: "", userEmail: "", justification: "" });
      } else {
        toast.error(result?.serverError ?? "Failed to revoke superadmin role");
      }
    } catch (error) {
      toast.error("Failed to revoke superadmin role");
    } finally {
      setIsRevokeLoading(false);
    }
  };

  if (!isSuperAdmin) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Superadmin Management</CardTitle>
        <CardDescription>
          Assign or revoke superadmin privileges. All actions are logged and
          audited.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-3">
          <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
            <DialogTrigger asChild>
              <Button variant="default" className="gap-2">
                <ShieldPlusIcon className="h-4 w-4" />
                Assign Superadmin
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Assign Superadmin Role</DialogTitle>
                <DialogDescription>
                  Grant system-wide superadmin privileges to a user. This action
                  is logged and requires justification.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="assign-userId">User ID</Label>
                  <Input
                    id="assign-userId"
                    placeholder="Enter user ID"
                    value={assignForm.userId}
                    onChange={(e) =>
                      setAssignForm({ ...assignForm, userId: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="assign-userEmail">User Email</Label>
                  <Input
                    id="assign-userEmail"
                    type="email"
                    placeholder="user@example.com"
                    value={assignForm.userEmail}
                    onChange={(e) =>
                      setAssignForm({
                        ...assignForm,
                        userEmail: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="assign-justification">Justification</Label>
                  <Textarea
                    id="assign-justification"
                    placeholder="Explain why this user needs superadmin access..."
                    value={assignForm.justification}
                    onChange={(e) =>
                      setAssignForm({
                        ...assignForm,
                        justification: e.target.value,
                      })
                    }
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">
                    Minimum 10 characters. This will be logged in the audit trail.
                  </p>
                </div>
                <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 p-4">
                  <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                    Warning
                  </p>
                  <p className="text-xs text-amber-800 dark:text-amber-200 mt-1">
                    Superadmin privileges grant full system access across all
                    organizations. Only assign to trusted individuals.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsAssignOpen(false)}
                  disabled={isAssignLoading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAssignSuperadmin}
                  disabled={isAssignLoading}
                >
                  {isAssignLoading ? "Assigning..." : "Assign Superadmin"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isRevokeOpen} onOpenChange={setIsRevokeOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive" className="gap-2">
                <ShieldXIcon className="h-4 w-4" />
                Revoke Superadmin
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Revoke Superadmin Role</DialogTitle>
                <DialogDescription>
                  Remove superadmin privileges from a user. This action is logged
                  and requires justification.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="revoke-userId">User ID</Label>
                  <Input
                    id="revoke-userId"
                    placeholder="Enter user ID"
                    value={revokeForm.userId}
                    onChange={(e) =>
                      setRevokeForm({ ...revokeForm, userId: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="revoke-userEmail">User Email</Label>
                  <Input
                    id="revoke-userEmail"
                    type="email"
                    placeholder="user@example.com"
                    value={revokeForm.userEmail}
                    onChange={(e) =>
                      setRevokeForm({
                        ...revokeForm,
                        userEmail: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="revoke-justification">Justification</Label>
                  <Textarea
                    id="revoke-justification"
                    placeholder="Explain why superadmin access should be revoked..."
                    value={revokeForm.justification}
                    onChange={(e) =>
                      setRevokeForm({
                        ...revokeForm,
                        justification: e.target.value,
                      })
                    }
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">
                    Minimum 10 characters. This will be logged in the audit
                    trail.
                  </p>
                </div>
                <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
                  <p className="text-sm font-medium text-destructive">
                    Warning
                  </p>
                  <p className="text-xs text-destructive/80 mt-1">
                    Revoking superadmin privileges will immediately remove all
                    system-wide access. The user will be demoted to standard user
                    role.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsRevokeOpen(false)}
                  disabled={isRevokeLoading}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleRevokeSuperadmin}
                  disabled={isRevokeLoading}
                >
                  {isRevokeLoading ? "Revoking..." : "Revoke Superadmin"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="rounded-lg border bg-muted/50 p-4">
          <h3 className="text-sm font-semibold mb-2">Superadmin Guidelines</h3>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <Badge variant="outline" className="mt-0.5">
                1
              </Badge>
              <span>Maximum 3-5 superadmin accounts recommended</span>
            </li>
            <li className="flex items-start gap-2">
              <Badge variant="outline" className="mt-0.5">
                2
              </Badge>
              <span>All assignments require written justification</span>
            </li>
            <li className="flex items-start gap-2">
              <Badge variant="outline" className="mt-0.5">
                3
              </Badge>
              <span>MFA required for all superadmin accounts</span>
            </li>
            <li className="flex items-start gap-2">
              <Badge variant="outline" className="mt-0.5">
                4
              </Badge>
              <span>Quarterly privilege review mandatory</span>
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
