"use client";

import { useState, useMemo } from "react";
import { Loader2Icon } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { AttendeeEmailInput } from "./attendee-email-input";
import { useOrganizationUsersQuery } from "@/features/tasks/hooks/use-organization-users-query";
import { getUserDisplayName } from "@/lib/formatters/display-formatters";

interface AttendeeSelectorProps {
  selectedUserIds: string[];
  selectedEmails: string[];
  onUserIdsChange: (userIds: string[]) => void;
  onEmailsChange: (emails: string[]) => void;
  disabled?: boolean;
}

export function AttendeeSelector({
  selectedUserIds,
  selectedEmails,
  onUserIdsChange,
  onEmailsChange,
  disabled = false,
}: AttendeeSelectorProps) {
  const { data: organizationUsers = [], isLoading: loadingUsers } =
    useOrganizationUsersQuery();

  // Get set of organization member emails for deduplication
  const orgMemberEmails = useMemo(
    () => new Set(organizationUsers.map((user) => user.email).filter(Boolean) as string[]),
    [organizationUsers]
  );

  const toggleUserAttendee = (userId: string) => {
    if (selectedUserIds.includes(userId)) {
      onUserIdsChange(selectedUserIds.filter((id) => id !== userId));
    } else {
      onUserIdsChange([...selectedUserIds, userId]);
    }
  };

  const addCustomEmail = (email: string) => {
    if (selectedEmails.includes(email) || orgMemberEmails.has(email)) {
      return;
    }
    onEmailsChange([...selectedEmails, email]);
  };

  const removeCustomEmail = (email: string) => {
    onEmailsChange(selectedEmails.filter((e) => e !== email));
  };

  const [emailInput, setEmailInput] = useState("");

  return (
    <div className="space-y-3">
      <Label>Attendees</Label>

      {/* Organization Users */}
      {loadingUsers ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2Icon className="h-4 w-4 animate-spin" />
          Loading organization users...
        </div>
      ) : organizationUsers.length > 0 ? (
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">
            Organization Members
          </Label>
          <div className="max-h-32 overflow-y-auto border rounded-md p-2 space-y-2">
            {organizationUsers.map((user) => {
              const isSelected = selectedUserIds.includes(user.id);
              const displayName = getUserDisplayName({
                email: user.email,
                given_name: user.given_name,
                family_name: user.family_name,
              });
              return (
                <div key={user.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`user-${user.id}`}
                    checked={isSelected}
                    onCheckedChange={() => toggleUserAttendee(user.id)}
                    disabled={disabled}
                  />
                  <Label
                    htmlFor={`user-${user.id}`}
                    className="text-sm font-normal cursor-pointer flex-1"
                  >
                    {displayName}
                    {user.email && (
                      <span className="text-muted-foreground ml-1">
                        ({user.email})
                      </span>
                    )}
                  </Label>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* Custom Email Input */}
      <div className="space-y-2">
        <Label className="text-sm text-muted-foreground">
          Custom Email Addresses
        </Label>
        <AttendeeEmailInput
          value={emailInput}
          onChange={setEmailInput}
          onAdd={addCustomEmail}
          disabled={disabled}
        />

        {/* Display added custom emails */}
        {selectedEmails.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {selectedEmails.map((email) => (
              <Badge
                key={email}
                variant="outline"
                className="flex items-center gap-1 pr-1"
              >
                {email}
                <button
                  type="button"
                  onClick={() => removeCustomEmail(email)}
                  className="ml-1 hover:bg-muted rounded-full p-0.5"
                  aria-label={`Remove ${email}`}
                  disabled={disabled}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
