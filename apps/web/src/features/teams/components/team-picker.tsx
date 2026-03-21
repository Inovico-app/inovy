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

  // Build items map for Select.Root so SelectValue shows labels, not raw IDs
  const items = useMemo(() => {
    const map: Array<{ value: string; label: string }> = teams.map((t) => ({
      value: t.id,
      label: t.name,
    }));
    map.push({ value: "org-wide", label: "Org-wide" });
    return map;
  }, [teams]);

  return (
    <div className="space-y-2">
      <Label htmlFor="team-select">Team</Label>
      <Select
        value={value ?? "org-wide"}
        onValueChange={(v) => onChange(v === "org-wide" ? null : v)}
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
          <SelectItem value="org-wide">Org-wide</SelectItem>
        </SelectContent>
      </Select>
      <VisibilityWarning teamName={selectedTeam?.name} />
    </div>
  );
}
