"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  downloadFile,
  exportAsJSON,
  exportAsSRT,
  exportAsText,
} from "@/features/recordings/lib/export-transcription-utils";
import { useOrganizationUsersQuery } from "@/features/tasks/hooks/use-organization-users-query";
import type { Utterance } from "@/server/dto/ai-insight.dto";
import { Download } from "lucide-react";
import { useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";

interface ExportTranscriptionButtonProps {
  utterances: Utterance[];
  recordingId: string;
  speakerNames?: Record<string, string>;
  speakerUserIds?: Record<string, string> | null;
}

export function ExportTranscriptionButton({
  utterances,
  recordingId,
  speakerNames,
  speakerUserIds,
}: ExportTranscriptionButtonProps) {
  const t = useTranslations("recordings");
  const { data: users = [] } = useOrganizationUsersQuery();

  // Create user map for efficient lookup
  const userMap = useMemo(() => {
    const map = new Map<
      string,
      {
        id: string;
        email: string | null;
        given_name: string | null;
        family_name: string | null;
      }
    >();
    users.forEach((user) => {
      map.set(user.id, {
        id: user.id,
        email: user.email,
        given_name: user.given_name,
        family_name: user.family_name,
      });
    });
    return map;
  }, [users]);

  const handleExportText = useCallback(() => {
    const content = exportAsText(
      utterances,
      speakerNames,
      speakerUserIds,
      userMap,
    );
    downloadFile(content, `transcription-${recordingId}.txt`, "text/plain");
  }, [utterances, recordingId, speakerNames, speakerUserIds, userMap]);

  const handleExportSRT = useCallback(() => {
    const content = exportAsSRT(
      utterances,
      speakerNames,
      speakerUserIds,
      userMap,
    );
    downloadFile(
      content,
      `transcription-${recordingId}.srt`,
      "application/x-subrip",
    );
  }, [utterances, recordingId, speakerNames, speakerUserIds, userMap]);

  const handleExportJSON = useCallback(() => {
    const content = exportAsJSON(
      utterances,
      speakerNames,
      speakerUserIds,
      userMap,
    );
    downloadFile(
      content,
      `transcription-${recordingId}.json`,
      "application/json",
    );
  }, [utterances, recordingId, speakerNames, speakerUserIds, userMap]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            title={t("transcription.exportTranscription")}
          />
        }
      >
        <Download className="h-4 w-4 mr-1" />
        {t("transcription.export")}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleExportText}>
          {t("transcription.exportAsTxt")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportSRT}>
          {t("transcription.exportAsSrt")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportJSON}>
          {t("transcription.exportAsJson")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
