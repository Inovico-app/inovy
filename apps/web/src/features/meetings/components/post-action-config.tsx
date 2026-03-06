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
  Save,
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
  const enabledCount = allActionTypes.filter((type) => enabled[type]).length;

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        {allActionTypes.map((type) => {
          const meta = actionMeta[type];
          const Icon = meta.icon;
          const executedAction = executedActions.find((a) => a.type === type);
          const isEnabled = enabled[type];

          return (
            <label
              key={type}
              htmlFor={`action-${type}`}
              className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                isEnabled
                  ? "border-primary/30 bg-primary/5"
                  : "border-border/60 bg-card hover:border-border"
              } ${executedAction ? "opacity-70 cursor-default" : ""}`}
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors ${
                  isEnabled
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
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
                      className={`text-[10px] px-1.5 py-0 ${postActionStatusColors[executedAction.status]}`}
                    >
                      {executedAction.status}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {meta.description}
                </p>
              </div>
              <Switch
                id={`action-${type}`}
                checked={isEnabled}
                onCheckedChange={() => handleToggle(type)}
                disabled={!!executedAction}
              />
            </label>
          );
        })}
      </div>

      {hasChanges && (
        <div className="flex items-center justify-between pt-2 border-t border-border/40">
          <p className="text-xs text-muted-foreground">
            {enabledCount} action{enabledCount !== 1 ? "s" : ""} selected
          </p>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isConfiguringPostActions}
          >
            <Save className="mr-1.5 h-3.5 w-3.5" />
            {isConfiguringPostActions ? "Saving..." : "Save Configuration"}
          </Button>
        </div>
      )}
    </div>
  );
}
