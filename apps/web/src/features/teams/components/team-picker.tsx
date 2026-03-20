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

interface TeamOption {
  id: string;
  name: string;
}

interface TeamPickerProps {
  teams: TeamOption[];
  value: string | null;
  onChange: (teamId: string | null) => void;
  activeTeamId?: string | null;
}

export function TeamPicker({
  teams,
  value,
  onChange,
  activeTeamId,
}: TeamPickerProps) {
  if (activeTeamId) {
    const teamName = teams.find((t) => t.id === activeTeamId)?.name;
    return <VisibilityWarning teamName={teamName} />;
  }

  const selectedTeam = value ? teams.find((t) => t.id === value) : null;

  return (
    <div className="space-y-2">
      <Label htmlFor="team-select">Team</Label>
      <Select
        value={value ?? "org-wide"}
        onValueChange={(v) => onChange(v === "org-wide" ? null : v)}
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
          <SelectItem value="org-wide">Org-wide</SelectItem>
        </SelectContent>
      </Select>
      <VisibilityWarning teamName={selectedTeam?.name} />
    </div>
  );
}
