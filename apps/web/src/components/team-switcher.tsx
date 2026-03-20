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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  listUserTeamsAction,
  type UserTeam,
} from "@/features/teams/actions/list-user-teams";
import { useTeamSwitcher } from "@/hooks/use-team-switcher";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Loader2, Users } from "lucide-react";
import { useCallback, useState } from "react";

interface UserTeamsData {
  teams: UserTeam[];
  activeTeamId: string | null;
}

async function fetchUserTeams(): Promise<UserTeamsData> {
  const result = await listUserTeamsAction({});
  const data = result?.data;
  if (data && "teams" in data && "activeTeamId" in data) {
    return data as UserTeamsData;
  }
  return { teams: [], activeTeamId: null };
}

const ALL_TEAMS_ID = null;

interface TeamSwitcherProps {
  collapsed?: boolean;
}

export function TeamSwitcher({ collapsed = false }: TeamSwitcherProps) {
  const { switchTeam, isSwitching } = useTeamSwitcher();
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.auth.userTeams(),
    queryFn: fetchUserTeams,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const teams = data?.teams ?? [];
  const activeTeamId = data?.activeTeamId ?? null;

  const activeTeam = activeTeamId
    ? (teams.find((t) => t.id === activeTeamId) ?? null)
    : null;

  const handleSelect = useCallback(
    (teamId: string | null) => {
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

  // No teams — nothing to show
  if (teams.length === 0) {
    return null;
  }

  const displayLabel = activeTeam ? activeTeam.name : "All Teams";

  const triggerContent = (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-accent/50 cursor-pointer",
        collapsed ? "justify-center w-10" : "w-full min-w-0",
      )}
      aria-label={collapsed ? `Active team: ${displayLabel}` : undefined}
    >
      <div className="relative shrink-0">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Users className="h-3.5 w-3.5" />
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
        <TeamDropdownContent
          teams={teams}
          activeTeamId={activeTeamId}
          isSwitching={isSwitching}
          onSelect={handleSelect}
        />
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
      <TeamDropdownContent
        teams={teams}
        activeTeamId={activeTeamId}
        isSwitching={isSwitching}
        onSelect={handleSelect}
      />
    </Popover>
  );
}

interface TeamDropdownContentProps {
  teams: UserTeam[];
  activeTeamId: string | null;
  isSwitching: boolean;
  onSelect: (teamId: string | null) => void;
}

function TeamDropdownContent({
  teams,
  activeTeamId,
  isSwitching,
  onSelect,
}: TeamDropdownContentProps) {
  const isAllTeamsActive = activeTeamId === ALL_TEAMS_ID;

  return (
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
            {/* All Teams option */}
            <CommandItem
              value="all-teams"
              onSelect={() => onSelect(null)}
              disabled={isSwitching}
              aria-selected={isAllTeamsActive}
              role="option"
            >
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-muted">
                <Users className="h-3 w-3 text-muted-foreground" />
              </div>
              <span className="flex-1 truncate">All Teams</span>
              {isAllTeamsActive && (
                <Check className="h-4 w-4 shrink-0 text-primary" />
              )}
            </CommandItem>

            {/* User's teams */}
            {teams.map((team) => {
              const isActive = team.id === activeTeamId;
              return (
                <CommandItem
                  key={team.id}
                  value={team.name}
                  onSelect={() => onSelect(team.id)}
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
}

function getTeamInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] ?? "").concat(words[1][0] ?? "").toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || "??";
}

interface TeamInitialsAvatarProps {
  name: string;
}

function TeamInitialsAvatar({ name }: TeamInitialsAvatarProps) {
  return (
    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-primary/10 text-primary text-[10px] font-semibold">
      {getTeamInitials(name)}
    </div>
  );
}
