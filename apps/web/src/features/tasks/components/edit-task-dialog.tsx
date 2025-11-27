"use client";

import { useState, useEffect } from "react";
import { Edit2 } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TaskDescriptionEditor } from "./task-description-editor";
import { TaskTagSelector } from "./task-tag-selector";
import { TaskVersionHistoryDialog } from "./task-version-history-dialog";
import { useOrganizationMembers } from "../hooks/use-organization-members";
import { useUpdateTaskMetadataMutation } from "../hooks/use-update-task-metadata-mutation";
import { useTaskTags } from "../hooks/use-task-tags";
import type { TaskDto } from "@/server/dto/task.dto";
import type { TaskPriority, TaskStatus } from "@/server/db/schema/tasks";

interface EditTaskDialogProps {
  task: TaskDto;
  onSuccess?: () => void;
}

export function EditTaskDialog({ task, onSuccess }: EditTaskDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [assigneeId, setAssigneeId] = useState<string | null>(
    task.assigneeId
  );
  const [dueDate, setDueDate] = useState<string>(
    task.dueDate
      ? new Date(task.dueDate).toISOString().slice(0, 16)
      : ""
  );
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  const { members, isLoading: membersLoading } = useOrganizationMembers();
  const { data: taskTags, isLoading: tagsLoading } = useTaskTags(task.id);
  const mutation = useUpdateTaskMetadataMutation({
    onSuccess: () => {
      setOpen(false);
      onSuccess?.();
    },
  });

  // Initialize tag selection when task tags are loaded
  useEffect(() => {
    if (taskTags) {
      setSelectedTagIds(taskTags.map((tag) => tag.id));
    }
  }, [taskTags]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    mutation.mutate({
      taskId: task.id,
      title,
      description: description ? description : undefined,
      priority,
      status,
      assigneeId: assigneeId ?? undefined,
      dueDate: dueDate ? (new Date(dueDate) as unknown as Date | null) : undefined,
      tagIds: selectedTagIds,
    });
  };

  const resetForm = () => {
    setTitle(task.title);
    setDescription(task.description ?? "");
    setPriority(task.priority);
    setStatus(task.status);
    setAssigneeId(task.assigneeId);
    setDueDate(
      task.dueDate
        ? new Date(task.dueDate).toISOString().slice(0, 16)
        : ""
    );
    if (taskTags) {
      setSelectedTagIds(taskTags.map((tag) => tag.id));
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        setOpen(newOpen);
        if (!newOpen) {
          resetForm();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Edit2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>Edit Task</DialogTitle>
                <DialogDescription>
                  Update the task details. Changes will be tracked in version
                  history.
                </DialogDescription>
              </div>
              <TaskVersionHistoryDialog taskId={task.id} />
            </div>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter task title"
                required
                maxLength={500}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <TaskDescriptionEditor
                value={description}
                onChange={setDescription}
                placeholder="Add a description..."
                maxLength={2000}
              />
            </div>

            {/* Priority and Status Row */}
            <div className="grid grid-cols-2 gap-4">
              {/* Priority */}
              <div className="space-y-2">
                <Label htmlFor="priority">
                  Priority <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={priority}
                  onValueChange={(value) => setPriority(value as TaskPriority)}
                >
                  <SelectTrigger id="priority">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label htmlFor="status">
                  Status <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={status}
                  onValueChange={(value) => setStatus(value as TaskStatus)}
                >
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Assignee */}
            <div className="space-y-2">
              <Label htmlFor="assignee">Assignee</Label>
              <Select
                value={assigneeId ?? "unassigned"}
                onValueChange={(value) =>
                  setAssigneeId(value === "unassigned" ? null : value)
                }
                disabled={membersLoading}
              >
                <SelectTrigger id="assignee">
                  <SelectValue placeholder="Select assignee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {members.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Due Date */}
            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>

            {/* Tags */}
            {!tagsLoading && (
              <TaskTagSelector
                selectedTagIds={selectedTagIds}
                onTagsChange={setSelectedTagIds}
              />
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending || !title.trim()}>
              {mutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

