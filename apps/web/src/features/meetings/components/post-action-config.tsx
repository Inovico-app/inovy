"use client";

import { useMemo, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Mail,
  ListTodo,
  Share2,
  CalendarPlus,
  ExternalLink,
} from "lucide-react";
import { useMeetingActions } from "../hooks/use-meeting-actions";
import { postActionStatusColors } from "../lib/meeting-constants";
import type { MeetingPostAction } from "@/server/db/schema/meeting-post-actions";
import type { PostActionType } from "@/server/db/schema/meeting-post-actions";

interface PostActionConfigProps {
  meetingId: string;
  postActions: MeetingPostAction[];
}

const actionMeta: Record<
  PostActionType,
  { label: string; description: string; icon: React.ElementType }
> = {
  send_summary_email: {
    label: "Send Summary Email",
    description: "Email meeting summary and key decisions to participants",
    icon: Mail,
  },
  create_tasks: {
    label: "Create Tasks",
    description: "Extract and create action items from the meeting",
    icon: ListTodo,
  },
  share_recording: {
    label: "Share Recording",
    description: "Generate a secure sharing link for the recording",
    icon: Share2,
  },
  generate_followup_agenda: {
    label: "Generate Follow-up Agenda",
    description: "Create a draft agenda for a follow-up meeting",
    icon: CalendarPlus,
  },
  push_external: {
    label: "Push to External",
    description: "Send summary to Slack or Google Docs",
    icon: ExternalLink,
  },
};

const allActionTypes: PostActionType[] = [
  "send_summary_email",
  "create_tasks",
  "share_recording",
  "generate_followup_agenda",
  "push_external",
];

function buildInitialEnabled(
  postActions: MeetingPostAction[]
): Record<PostActionType, boolean> {
  const initial: Record<PostActionType, boolean> = {
    send_summary_email: false,
    create_tasks: false,
    share_recording: false,
    generate_followup_agenda: false,
    push_external: false,
  };
  for (const action of postActions) {
    if (action.status === "pending") {
      initial[action.type as PostActionType] = true;
    }
  }
  return initial;
}

export function PostActionConfig({
  meetingId,
  postActions,
}: PostActionConfigProps) {
  const { configurePostActions, isConfiguringPostActions } =
    useMeetingActions();

  const initialEnabled = useMemo(
    () => buildInitialEnabled(postActions),
    [postActions]
  );
  const [enabled, setEnabled] = useState(initialEnabled);

  const hasChanges = allActionTypes.some(
    (type) => enabled[type] !== initialEnabled[type]
  );

  const handleToggle = (type: PostActionType) => {
    setEnabled((prev) => ({ ...prev, [type]: !prev[type] }));
  };

  const handleSave = () => {
    configurePostActions({
      meetingId,
      actions: allActionTypes.map((type) => ({
        type,
        enabled: enabled[type],
      })),
    });
  };

  const executedActions = postActions.filter((a) => a.status !== "pending");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Post-Meeting Actions</h3>
        {hasChanges && (
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isConfiguringPostActions}
          >
            {isConfiguringPostActions ? "Saving..." : "Save"}
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {allActionTypes.map((type) => {
          const meta = actionMeta[type];
          const Icon = meta.icon;
          const executedAction = executedActions.find((a) => a.type === type);

          return (
            <div
              key={type}
              className="flex items-center justify-between rounded-lg border p-3 bg-card"
            >
              <div className="flex items-center gap-3">
                <Icon className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="flex items-center gap-2">
                    <Label
                      htmlFor={`action-${type}`}
                      className="font-medium text-sm cursor-pointer"
                    >
                      {meta.label}
                    </Label>
                    {executedAction && (
                      <Badge
                        variant="secondary"
                        className={postActionStatusColors[executedAction.status]}
                      >
                        {executedAction.status}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {meta.description}
                  </p>
                </div>
              </div>
              <Switch
                id={`action-${type}`}
                checked={enabled[type]}
                onCheckedChange={() => handleToggle(type)}
                disabled={!!executedAction}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
