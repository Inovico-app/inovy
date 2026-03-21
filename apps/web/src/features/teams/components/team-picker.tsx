"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { VisibilityWarning } from "./visibility-warning";
import { useMemo } from "react";

const NO_TEAM_VALUE = "__no-team__";
const NO_TEAM_LABEL = "No team (visible to everyone)";

interface TeamOption {
  id: string;
  name: string;
}

interface TeamPickerProps {
  teams: TeamOption[];
  value: string | null;
  onChange: (teamId: string | null) => void;
}

export function TeamPicker({ teams, value, onChange }: TeamPickerProps) {
  const selectedTeam = value ? teams.find((t) => t.id === value) : null;

  const items = useMemo(() => {
    const map: Array<{ value: string; label: string }> = teams.map((t) => ({
      value: t.id,
      label: t.name,
    }));
    map.push({ value: NO_TEAM_VALUE, label: NO_TEAM_LABEL });
    return map;
  }, [teams]);

  return (
    <div className="space-y-2">
      <Label htmlFor="team-select">Team</Label>
      <Select
        value={value ?? NO_TEAM_VALUE}
        onValueChange={(v) => onChange(v === NO_TEAM_VALUE ? null : v)}
        items={items}
      >
        <SelectTrigger id="team-select">
          <SelectValue placeholder="Select a team" />
        </SelectTrigger>
        <SelectContent>
          {teams.map((team) => (
            <SelectItem key={team.id} value={team.id}>
              {team.name}
            </SelectItem>
          ))}
          <SelectItem value={NO_TEAM_VALUE}>{NO_TEAM_LABEL}</SelectItem>
        </SelectContent>
      </Select>
      <VisibilityWarning teamName={selectedTeam?.name} />
    </div>
  );
}
