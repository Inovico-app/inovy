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
} from "@/lib/export-transcription-utils";
import { Download } from "lucide-react";
import { useCallback } from "react";

interface Utterance {
  speaker: number;
  text: string;
  start: number;
  end: number;
  confidence: number;
}

interface ExportTranscriptionButtonProps {
  utterances: Utterance[];
  recordingId: string;
  speakerNames?: Record<number, string>;
}

export function ExportTranscriptionButton({
  utterances,
  recordingId,
  speakerNames,
}: ExportTranscriptionButtonProps) {
  const handleExportText = useCallback(() => {
    const content = exportAsText(utterances, speakerNames);
    downloadFile(
      content,
      `transcription-${recordingId}.txt`,
      "text/plain"
    );
  }, [utterances, recordingId, speakerNames]);

  const handleExportSRT = useCallback(() => {
    const content = exportAsSRT(utterances, speakerNames);
    downloadFile(
      content,
      `transcription-${recordingId}.srt`,
      "text/plain"
    );
  }, [utterances, recordingId, speakerNames]);

  const handleExportJSON = useCallback(() => {
    const content = exportAsJSON(utterances, speakerNames);
    downloadFile(
      content,
      `transcription-${recordingId}.json`,
      "application/json"
    );
  }, [utterances, recordingId, speakerNames]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" title="Exporteer transcriptie">
          <Download className="h-4 w-4 mr-1" />
          Exporteren
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleExportText}>
          Exporteer als TXT
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportSRT}>
          Exporteer als SRT (ondertitels)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportJSON}>
          Exporteer als JSON
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

