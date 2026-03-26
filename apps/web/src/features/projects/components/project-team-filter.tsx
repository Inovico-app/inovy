"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslations } from "next-intl";
import { useQueryState } from "nuqs";
import { GlobeIcon, UsersIcon } from "lucide-react";
import { useMemo } from "react";

interface Team {
  id: string;
  name: string;
}

interface ProjectTeamFilterProps {
  teams: Team[];
}

const ALL_VALUE = "__all__";
const EVERYONE_VALUE = "__everyone__";

export function ProjectTeamFilter({ teams }: ProjectTeamFilterProps) {
  const t = useTranslations("projects");
  const [teamFilter, setTeamFilter] = useQueryState("team", {
    defaultValue: "",
    shallow: false,
  });

  const items = useMemo(() => {
    const list: Array<{ value: string; label: string }> = [
      { value: ALL_VALUE, label: t("allProjects") },
      { value: EVERYONE_VALUE, label: t("everyoneNoTeam") },
    ];
    for (const t of teams) {
      list.push({ value: t.id, label: t.name });
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teams]);

  if (teams.length === 0) return null;

  return (
    <Select
      value={teamFilter || ALL_VALUE}
      onValueChange={(v) => {
        if (v === ALL_VALUE) {
          setTeamFilter(null);
        } else {
          setTeamFilter(v);
        }
      }}
      items={items}
    >
      <SelectTrigger className="w-48" aria-label={t("filterByTeam")}>
        <SelectValue placeholder={t("allProjects")} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_VALUE}>
          <span className="flex items-center gap-1.5">{t("allProjects")}</span>
        </SelectItem>
        <SelectItem value={EVERYONE_VALUE}>
          <span className="flex items-center gap-1.5">
            <GlobeIcon className="h-3.5 w-3.5" />
            {t("everyoneNoTeam")}
          </span>
        </SelectItem>
        {teams.map((team) => (
          <SelectItem key={team.id} value={team.id}>
            <span className="flex items-center gap-1.5">
              <UsersIcon className="h-3.5 w-3.5" />
              {team.name}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
