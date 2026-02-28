"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  useOrganizationSwitcher,
  type OrganizationWithRole,
} from "@/hooks/use-organization-switcher";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

function getOrgInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] ?? "").concat(words[1][0] ?? "").toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || "??";
}

function formatRole(role: string): string {
  const r = role?.toLowerCase() ?? "";
  if (r === "owner") return "Owner";
  if (r === "admin" || r === "superadmin") return "Admin";
  if (r === "manager") return "Manager";
  if (r === "viewer") return "Viewer";
  return "Member";
}

interface OrganizationSwitcherProps {
  collapsed?: boolean;
}

export function OrganizationSwitcher({
  collapsed = false,
}: OrganizationSwitcherProps) {
  const { state, actions } = useOrganizationSwitcher();
  const [open, setOpen] = useState(false);

  const {
    organizations,
    activeOrganization,
    activeMemberRole,
    isLoading,
    isSwitching,
  } = state;

  const handleSelect = useCallback(
    async (org: OrganizationWithRole) => {
      if (org.id === activeOrganization?.id) {
        setOpen(false);
        return;
      }
      try {
        await actions.switchOrganization(org.id);
        setOpen(false);
      } catch {
        toast.error("Failed to switch organization. Please try again.");
      }
    },
    [activeOrganization?.id, actions]
  );

  if (isLoading) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-2",
          collapsed && "justify-center px-2"
        )}
      >
        <Skeleton className="h-8 w-8 rounded-full" />
        {!collapsed && <Skeleton className="h-4 flex-1 min-w-0" />}
      </div>
    );
  }

  if (!activeOrganization || organizations.length === 0) {
    return null;
  }

  const isMultiOrg = organizations.length > 1;

  const triggerContent = (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors",
        isMultiOrg && "hover:bg-accent/50 cursor-pointer",
        collapsed ? "justify-center w-10" : "w-full min-w-0"
      )}
      aria-label={
        collapsed
          ? `Active organization: ${activeOrganization.name}`
          : undefined
      }
    >
      <div className="relative shrink-0">
        <Avatar className="h-8 w-8">
          <AvatarImage src={activeOrganization.logo ?? undefined} alt="" />
          <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
            {getOrgInitials(activeOrganization.name)}
          </AvatarFallback>
        </Avatar>
        {collapsed && isMultiOrg && isSwitching && (
          <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-background">
            <Loader2 className="h-2.5 w-2.5 animate-spin text-muted-foreground" />
          </span>
        )}
      </div>
      {!collapsed && (
        <div className="flex flex-1 min-w-0 items-center gap-2">
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-medium">
              {activeOrganization.name}
            </span>
            {activeMemberRole && (
              <Badge
                variant="secondary"
                className="w-fit text-[10px] px-1.5 py-0 font-normal"
              >
                {formatRole(activeMemberRole)}
              </Badge>
            )}
          </div>
          {isMultiOrg &&
            (isSwitching ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
            ) : (
              <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
            ))}
        </div>
      )}
    </div>
  );

  if (!isMultiOrg) {
    if (collapsed) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex justify-center px-2 py-2">
              {triggerContent}
            </div>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>{activeOrganization.name}</p>
            {activeMemberRole && (
              <p className="text-muted-foreground text-xs">
                {formatRole(activeMemberRole)}
              </p>
            )}
          </TooltipContent>
        </Tooltip>
      );
    }
    return (
      <div
        className="px-3 py-2"
        aria-label={`Organization: ${activeOrganization.name}`}
      >
        {triggerContent}
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "w-full text-left outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg",
            collapsed && "flex justify-center"
          )}
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-label={`Switch organization. Current: ${activeOrganization.name}`}
          title={
            collapsed
              ? `${activeOrganization.name}. Click to switch.`
              : undefined
          }
        >
          {triggerContent}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="min-w-64 w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
        side="right"
      >
        <Command>
          <CommandInput placeholder="Search organizations..." />
          <CommandList>
            <CommandEmpty>No organization found.</CommandEmpty>
            <CommandGroup>
              {organizations.map((org) => {
                const isActive = org.id === activeOrganization.id;

                return (
                  <CommandItem
                    key={org.id}
                    value={org.name}
                    onSelect={() => handleSelect(org)}
                    disabled={isSwitching}
                    aria-selected={isActive}
                    role="option"
                  >
                    <Avatar className="h-6 w-6 shrink-0">
                      <AvatarImage src={org.logo ?? undefined} alt="" />
                      <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                        {getOrgInitials(org.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="flex-1 truncate">{org.name}</span>
                    <span className="text-muted-foreground text-xs shrink-0">
                      {formatRole(org.role)}
                    </span>
                    {isActive && (
                      <Check className="h-4 w-4 shrink-0 text-primary" />
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

