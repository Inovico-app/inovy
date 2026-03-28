"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TaskDto } from "@/server/dto/task.dto";
import { useUpdateTaskMutation } from "../hooks/use-update-task-mutation";
import { useOrganizationUsersQuery } from "../hooks/use-organization-users-query";
import { Pencil, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

interface TaskEditDialogProps {
  task: TaskDto;
  trigger?: React.ReactElement;
}

// Priority and status labels are resolved dynamically via useTranslations in the component

export function TaskEditDialog({ task, trigger }: TaskEditDialogProps) {
  const [open, setOpen] = useState(false);
  const t = useTranslations("tasks");
  const tc = useTranslations("common");
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || "");
  const [priority, setPriority] = useState(task.priority);
  const [status, setStatus] = useState(task.status);
  const [dueDate, setDueDate] = useState(
    task.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : "",
  );
  const [assigneeId, setAssigneeId] = useState(task.assigneeId || "");
  const { data: orgUsers = [] } = useOrganizationUsersQuery();

  const priorityLabels = {
    low: t("priorityLow"),
    medium: t("priorityMedium"),
    high: t("priorityHigh"),
    urgent: t("priorityUrgent"),
  } as const;

  const statusLabels = {
    pending: t("statusPending"),
    in_progress: t("statusInProgress"),
    completed: t("statusCompleted"),
    cancelled: t("statusCancelled"),
  } as const;

  const updateMutation = useUpdateTaskMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const selectedUser = orgUsers.find((u) => u.id === assigneeId);
    const assigneeName = selectedUser
      ? [selectedUser.given_name, selectedUser.family_name]
          .filter(Boolean)
          .join(" ") || selectedUser.email
      : null;

    await updateMutation.mutateAsync({
      taskId: task.id,
      title,
      description: description || null,
      priority,
      status,
      dueDate: dueDate ? new Date(dueDate) : null,
      assigneeId: assigneeId || null,
      assigneeName: assigneeName || null,
    });

    setOpen(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset form when closing
      setTitle(task.title);
      setDescription(task.description || "");
      setPriority(task.priority);
      setStatus(task.status);
      setDueDate(
        task.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : "",
      );
      setAssigneeId(task.assigneeId || "");
    }
    setOpen(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger ? (
        <DialogTrigger render={trigger as React.ReactElement} />
      ) : (
        <DialogTrigger render={<Button variant="ghost" size="sm" />}>
          <Pencil className="h-4 w-4" />
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[600px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t("editTaskDialogTitle")}</DialogTitle>
            <DialogDescription>
              {t("editTaskDialogDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">{t("titleRequired")}</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("taskTitlePlaceholder")}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">{t("descriptionLabel")}</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("taskDescriptionPlaceholder")}
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="priority">{t("priorityLabel")}</Label>
                <Select
                  value={priority}
                  onValueChange={(value) =>
                    value && setPriority(value as typeof priority)
                  }
                  items={priorityLabels}
                >
                  <SelectTrigger id="priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">{priorityLabels.low}</SelectItem>
                    <SelectItem value="medium">
                      {priorityLabels.medium}
                    </SelectItem>
                    <SelectItem value="high">{priorityLabels.high}</SelectItem>
                    <SelectItem value="urgent">
                      {priorityLabels.urgent}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={status}
                  onValueChange={(value) =>
                    value && setStatus(value as typeof status)
                  }
                  items={statusLabels}
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">
                      {statusLabels.pending}
                    </SelectItem>
                    <SelectItem value="in_progress">
                      {statusLabels.in_progress}
                    </SelectItem>
                    <SelectItem value="completed">
                      {statusLabels.completed}
                    </SelectItem>
                    <SelectItem value="cancelled">
                      {statusLabels.cancelled}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="assignee">{t("assigneeLabel")}</Label>
              <Select
                value={assigneeId}
                onValueChange={(value) => setAssigneeId(value ?? "")}
              >
                <SelectTrigger id="assignee">
                  <SelectValue placeholder={t("unassigned")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">
                    <span className="text-muted-foreground">
                      {t("unassigned")}
                    </span>
                  </SelectItem>
                  {orgUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex items-center gap-2">
                        <span>
                          {[user.given_name, user.family_name]
                            .filter(Boolean)
                            .join(" ") || user.email}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="dueDate">{t("deadlineLabel")}</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={updateMutation.isPending}
            >
              {tc("cancel")}
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {tc("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
