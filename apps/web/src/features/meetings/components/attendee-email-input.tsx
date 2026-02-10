"use client";

import { useState, useMemo, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useOrganizationUsersQuery } from "@/features/tasks/hooks/use-organization-users-query";

interface AttendeeEmailInputProps {
  value: string;
  onChange: (value: string) => void;
  onAdd: (email: string) => void;
  disabled?: boolean;
}

export function AttendeeEmailInput({
  value,
  onChange,
  onAdd,
  disabled = false,
}: AttendeeEmailInputProps) {
  const [emailSuggestionsOpen, setEmailSuggestionsOpen] = useState(false);
  const { data: organizationUsers = [] } = useOrganizationUsersQuery();

  // Helper function to get user display name
  const getUserDisplayName = useCallback(
    (user: {
      email: string | null;
      given_name: string | null;
      family_name: string | null;
    }) => {
      if (user.given_name && user.family_name) {
        return `${user.given_name} ${user.family_name}`;
      }
      if (user.given_name) {
        return user.given_name;
      }
      return user.email || "Unknown";
    },
    []
  );

  // Filter organization users based on email input
  const emailSuggestions = useMemo(() => {
    if (!value.trim()) {
      return [];
    }

    const input = value.toLowerCase().trim();
    return organizationUsers
      .filter((user) => {
        if (!user.email) return false;
        const email = user.email.toLowerCase();
        const name = getUserDisplayName(user).toLowerCase();
        return email.includes(input) || name.includes(input);
      })
      .slice(0, 5); // Limit to 5 suggestions
  }, [value, organizationUsers, getUserDisplayName]);

  const handleAdd = () => {
    const email = value.trim();
    if (!email) return;

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return;
    }

    onAdd(email);
    onChange("");
  };

  return (
    <Popover
      open={emailSuggestionsOpen && emailSuggestions.length > 0}
      onOpenChange={setEmailSuggestionsOpen}
    >
      <div className="flex gap-2">
        <PopoverTrigger asChild>
          <div className="flex-1 relative">
            <Input
              type="email"
              placeholder="Enter email address"
              value={value}
              onChange={(e) => {
                onChange(e.target.value);
                setEmailSuggestionsOpen(e.target.value.trim().length > 0);
              }}
              onFocus={() => {
                if (value.trim().length > 0 && emailSuggestions.length > 0) {
                  setEmailSuggestionsOpen(true);
                }
              }}
              onBlur={() => {
                // Delay closing to allow for clicks on suggestions
                setTimeout(() => setEmailSuggestionsOpen(false), 200);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAdd();
                  setEmailSuggestionsOpen(false);
                } else if (e.key === "Escape") {
                  setEmailSuggestionsOpen(false);
                }
              }}
              disabled={disabled}
            />
          </div>
        </PopoverTrigger>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-0"
          align="start"
        >
          <Command>
            <CommandList>
              <CommandEmpty>No matching users found.</CommandEmpty>
              <CommandGroup heading="Organization Members">
                {emailSuggestions.map((user) => (
                  <CommandItem
                    key={user.id}
                    value={user.email || ""}
                    onSelect={() => {
                      if (user.email) {
                        onChange(user.email);
                        setEmailSuggestionsOpen(false);
                      }
                    }}
                    className="cursor-pointer"
                  >
                    <div className="flex flex-col">
                      <span className="text-sm">{getUserDisplayName(user)}</span>
                      {user.email && (
                        <span className="text-xs text-muted-foreground">
                          {user.email}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
        <Button
          type="button"
          variant="outline"
          onClick={handleAdd}
          disabled={!value.trim() || disabled}
        >
          Add
        </Button>
      </div>
    </Popover>
  );
}
