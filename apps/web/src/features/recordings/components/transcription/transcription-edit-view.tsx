"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Save, Search, X } from "lucide-react";
import { useTranscriptionEditState } from "../../hooks/use-transcription-edit-state";
import { useUpdateTranscriptionMutation } from "../../hooks/use-update-transcription-mutation";
import { ExportTranscriptionButton } from "./export-transcription-button";
import { TranscriptionHistoryDialog } from "../transcription-history-dialog";
import type { TranscriptionEditViewProps } from "./types";
import { useTranslations } from "next-intl";

export function TranscriptionEditView({
  recordingId,
  transcriptionText,
  utterances,
  speakerNames,
  speakerUserIds,
  isManuallyEdited,
  lastEditedAt,
  speakersDetected,
  confidence,
  onCancel,
  onSuccess,
}: TranscriptionEditViewProps) {
  const t = useTranslations("recordings");
  const tc = useTranslations("common");
  const {
    state,
    setEditedText,
    setChangeDescription,
    toggleSearchReplace,
    setSearchTerm,
    setReplaceTerm,
    executeReplace,
    reset,
    closeSearchReplace,
  } = useTranscriptionEditState(transcriptionText);

  const updateMutation = useUpdateTranscriptionMutation({
    onSuccess: () => {
      reset(transcriptionText);
      onSuccess();
    },
  });

  const handleSave = () => {
    updateMutation.mutate({
      recordingId,
      content: state.editedText,
      changeDescription: state.changeDescription || undefined,
    });
  };

  const handleCancel = () => {
    reset(transcriptionText);
    onCancel();
  };

  return (
    <div className="space-y-4">
      {/* Header with metadata */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-medium">
            {t("transcription.editTranscription")}
          </h3>
          {isManuallyEdited && (
            <Badge variant="secondary" className="text-xs">
              {t("transcription.manuallyEdited")}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {speakersDetected !== undefined && speakersDetected > 0 && (
            <Badge variant="outline">
              {t("transcription.speakerCount", { count: speakersDetected })}
            </Badge>
          )}
          {confidence !== undefined && (
            <Badge variant="outline">
              {t("transcription.confidence", {
                value: Math.round(confidence * 100),
              })}
            </Badge>
          )}
        </div>
      </div>

      {lastEditedAt && (
        <p className="text-xs text-muted-foreground">
          Laatst bewerkt op{" "}
          {new Date(lastEditedAt).toLocaleString("nl-NL", {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </p>
      )}

      {/* Search and Replace */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={toggleSearchReplace}>
          <Search className="h-4 w-4 mr-1" />
          {t("transcription.searchAndReplace")}
        </Button>
      </div>

      {state.showSearchReplace && (
        <Card className="p-4 bg-muted/50">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search-term">
                {t("transcription.searchFor")}
              </Label>
              <Input
                id="search-term"
                value={state.searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t("transcription.searchPlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="replace-term">
                {t("transcription.replaceWith")}
              </Label>
              <Input
                id="replace-term"
                value={state.replaceTerm}
                onChange={(e) => setReplaceTerm(e.target.value)}
                placeholder={t("transcription.replacePlaceholder")}
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={closeSearchReplace}>
              Annuleren
            </Button>
            <Button
              size="sm"
              onClick={executeReplace}
              disabled={!state.searchTerm}
            >
              {t("transcription.replaceAll")}
            </Button>
          </div>
        </Card>
      )}

      {/* Change Description */}
      <div className="space-y-2">
        <Label htmlFor="change-description">
          {t("transcription.changeDescriptionLabel")}
        </Label>
        <Input
          id="change-description"
          value={state.changeDescription}
          onChange={(e) => setChangeDescription(e.target.value)}
          placeholder={t("transcription.changeDescriptionPlaceholder")}
          maxLength={500}
        />
      </div>

      {/* Editor */}
      <div className="space-y-2">
        <Label htmlFor="transcription-text">
          {t("transcription.transcriptionText")}
        </Label>
        <Textarea
          id="transcription-text"
          value={state.editedText}
          onChange={(e) => setEditedText(e.target.value)}
          className="min-h-[400px] font-mono text-sm"
          placeholder={t("transcription.transcriptionPlaceholder")}
        />
        <p className="text-xs text-muted-foreground">
          {t("transcription.characterCount", {
            count: state.editedText.length,
          })}
        </p>
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center">
        {utterances && utterances.length > 0 ? (
          <ExportTranscriptionButton
            utterances={utterances}
            recordingId={recordingId}
            speakerNames={speakerNames ?? undefined}
            speakerUserIds={speakerUserIds}
          />
        ) : (
          <div />
        )}
        <div className="flex gap-2">
          <TranscriptionHistoryDialog recordingId={recordingId} />
          <Button variant="outline" onClick={handleCancel}>
            <X className="h-4 w-4 mr-1" />
            {tc("cancel")}
          </Button>
          <Button
            onClick={handleSave}
            disabled={
              updateMutation.isPending || state.editedText === transcriptionText
            }
          >
            <Save className="h-4 w-4 mr-1" />
            {updateMutation.isPending ? t("transcription.saving") : tc("save")}
          </Button>
        </div>
      </div>
    </div>
  );
}
