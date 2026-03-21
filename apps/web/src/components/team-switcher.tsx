"use client";

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
  type UserTeam,
  type UserTeamsData,
} from "@/features/teams/actions/list-user-teams";
import { fetchUserTeams } from "@/hooks/use-team-picker";
import { useTeamSwitcher } from "@/hooks/use-team-switcher";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Loader2, Users } from "lucide-react";
import { useCallback, useState } from "react";

interface TeamSwitcherProps {
  collapsed?: boolean;
}

export function TeamSwitcher({ collapsed = false }: TeamSwitcherProps) {
  const { switchTeam, isSwitching } = useTeamSwitcher();
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery<UserTeamsData>({
    queryKey: queryKeys.auth.userTeams(),
    queryFn: fetchUserTeams,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const teams = data?.teams ?? [];
  const activeTeamId = data?.activeTeamId ?? null;
  const isOrgAdmin = data?.isOrgAdmin ?? false;

  const activeTeam = activeTeamId
    ? (teams.find((t: UserTeam) => t.id === activeTeamId) ?? null)
    : null;

  const handleSelect = useCallback(
    (teamId: string) => {
      if (teamId === activeTeamId) {
        setOpen(false);
        return;
      }
      switchTeam(teamId);
      setOpen(false);
    },
    [activeTeamId, switchTeam],
  );

  if (isLoading) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-2",
          collapsed && "justify-center px-2",
        )}
      >
        <Skeleton className="h-7 w-7 rounded-md" />
        {!collapsed && <Skeleton className="h-4 flex-1 min-w-0" />}
      </div>
    );
  }

  // Org admins see everything — no team switcher needed
  if (isOrgAdmin) {
    return null;
  }

  // No teams — nothing to show
  if (teams.length === 0) {
    return null;
  }

  // Only one team — show it as a label, no dropdown needed
  if (teams.length === 1) {
    const team = teams[0];
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-lg px-2 py-1.5",
          collapsed ? "justify-center w-10" : "w-full min-w-0",
        )}
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary shrink-0">
          <Users className="h-3.5 w-3.5" aria-hidden="true" />
        </div>
        {!collapsed && (
          <span className="truncate text-sm font-medium">{team.name}</span>
        )}
      </div>
    );
  }

  // Auto-select first team if none is active
  if (!activeTeamId && teams.length > 0) {
    switchTeam(teams[0].id);
  }

  const displayLabel = activeTeam?.name ?? teams[0]?.name ?? "Select team";

  const triggerContent = (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-accent/50 cursor-pointer",
        collapsed ? "justify-center w-10" : "w-full min-w-0",
      )}
    >
      <div className="relative shrink-0">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Users className="h-3.5 w-3.5" aria-hidden="true" />
        </div>
        {collapsed && isSwitching && (
          <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-background">
            <Loader2 className="h-2.5 w-2.5 animate-spin text-muted-foreground" />
          </span>
        )}
      </div>
      {!collapsed && (
        <div className="flex flex-1 min-w-0 items-center gap-2">
          <span className="truncate text-sm font-medium">{displayLabel}</span>
          {isSwitching ? (
            <Loader2 className="ml-auto h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
          ) : (
            <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" />
          )}
        </div>
      )}
    </div>
  );

  const dropdownContent = (
    <PopoverContent
      className="min-w-56 w-[var(--radix-popover-trigger-width)] p-0"
      align="start"
      side="right"
    >
      <Command>
        <CommandInput placeholder="Search teams..." />
        <CommandList>
          <CommandEmpty>No team found.</CommandEmpty>
          <CommandGroup>
            {teams.map((team: UserTeam) => {
              const isActive = team.id === activeTeamId;
              return (
                <CommandItem
                  key={team.id}
                  value={team.name}
                  onSelect={() => handleSelect(team.id)}
                  disabled={isSwitching}
                  aria-selected={isActive}
                  role="option"
                >
                  <TeamInitialsAvatar name={team.name} />
                  <span className="flex-1 truncate">{team.name}</span>
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
  );

  if (collapsed) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <button
              type="button"
              className="flex justify-center outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg"
              aria-expanded={open}
              aria-haspopup="listbox"
              aria-label={`Switch team. Current: ${displayLabel}`}
              title={`${displayLabel}. Click to switch.`}
            />
          }
        >
          {triggerContent}
        </PopoverTrigger>
        {dropdownContent}
      </Popover>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            className="w-full text-left outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg"
            aria-expanded={open}
            aria-haspopup="listbox"
            aria-label={`Switch team. Current: ${displayLabel}`}
          />
        }
      >
        {triggerContent}
      </PopoverTrigger>
      {dropdownContent}
    </Popover>
  );
}

function getTeamInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] ?? "").concat(words[1][0] ?? "").toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || "??";
}

function TeamInitialsAvatar({ name }: { name: string }) {
  return (
    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-primary/10 text-primary text-[10px] font-semibold">
      {getTeamInitials(name)}
    </div>
  );
}
