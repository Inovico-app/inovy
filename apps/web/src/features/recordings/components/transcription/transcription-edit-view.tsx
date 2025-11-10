"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Download, Save, Search, X } from "lucide-react";
import { useState } from "react";
import { useUpdateTranscriptionMutation } from "../../hooks/use-update-transcription-mutation";
import { TranscriptionHistoryDialog } from "../transcription-history-dialog";
import type { TranscriptionEditViewProps } from "./types";

export function TranscriptionEditView({
  recordingId,
  transcriptionText,
  isManuallyEdited,
  lastEditedAt,
  speakersDetected,
  confidence,
  onCancel,
  onSuccess,
}: TranscriptionEditViewProps) {
  const [editedText, setEditedText] = useState(transcriptionText);
  const [changeDescription, setChangeDescription] = useState("");
  const [showSearchReplace, setShowSearchReplace] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [replaceTerm, setReplaceTerm] = useState("");

  const updateMutation = useUpdateTranscriptionMutation({
    onSuccess: () => {
      setEditedText(transcriptionText);
      setChangeDescription("");
      onSuccess();
    },
  });

  const handleSave = () => {
    updateMutation.mutate({
      recordingId,
      content: editedText,
      changeDescription: changeDescription || undefined,
    });
  };

  const handleCancel = () => {
    setEditedText(transcriptionText);
    setChangeDescription("");
    setShowSearchReplace(false);
    onCancel();
  };

  const handleExport = () => {
    const blob = new Blob([transcriptionText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transcription-${recordingId}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSearchReplace = () => {
    if (!searchTerm) return;
    const newText = editedText.replaceAll(searchTerm, replaceTerm);
    setEditedText(newText);
    setSearchTerm("");
    setReplaceTerm("");
    setShowSearchReplace(false);
  };

  return (
    <div className="space-y-4">
      {/* Header with metadata */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-medium">Bewerk transcriptie</h3>
          {isManuallyEdited && (
            <Badge variant="secondary" className="text-xs">
              Handmatig bewerkt
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {speakersDetected !== undefined && speakersDetected > 0 && (
            <Badge variant="outline">
              {speakersDetected}{" "}
              {speakersDetected === 1 ? "spreker" : "sprekers"}
            </Badge>
          )}
          {confidence !== undefined && (
            <Badge variant="outline">
              {Math.round(confidence * 100)}% vertrouwen
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
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowSearchReplace(!showSearchReplace)}
        >
          <Search className="h-4 w-4 mr-1" />
          Zoek & Vervang
        </Button>
      </div>

      {showSearchReplace && (
        <Card className="p-4 bg-muted/50">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search-term">Zoeken naar</Label>
              <Input
                id="search-term"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Zoekterm..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="replace-term">Vervangen door</Label>
              <Input
                id="replace-term"
                value={replaceTerm}
                onChange={(e) => setReplaceTerm(e.target.value)}
                placeholder="Vervangende tekst..."
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchTerm("");
                setReplaceTerm("");
                setShowSearchReplace(false);
              }}
            >
              Annuleren
            </Button>
            <Button
              size="sm"
              onClick={handleSearchReplace}
              disabled={!searchTerm}
            >
              Vervang Alle
            </Button>
          </div>
        </Card>
      )}

      {/* Change Description */}
      <div className="space-y-2">
        <Label htmlFor="change-description">
          Beschrijving van wijzigingen (optioneel)
        </Label>
        <Input
          id="change-description"
          value={changeDescription}
          onChange={(e) => setChangeDescription(e.target.value)}
          placeholder="Bijv. Correctie van namen, spelling..."
          maxLength={500}
        />
      </div>

      {/* Editor */}
      <div className="space-y-2">
        <Label htmlFor="transcription-text">Transcriptie tekst</Label>
        <Textarea
          id="transcription-text"
          value={editedText}
          onChange={(e) => setEditedText(e.target.value)}
          className="min-h-[400px] font-mono text-sm"
          placeholder="Transcriptie tekst..."
        />
        <p className="text-xs text-muted-foreground">
          {editedText.length} karakters
        </p>
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleExport}
          title="Exporteer transcriptie"
        >
          <Download className="h-4 w-4 mr-1" />
          Exporteer
        </Button>
        <div className="flex gap-2">
          <TranscriptionHistoryDialog recordingId={recordingId} />
          <Button variant="outline" onClick={handleCancel}>
            <X className="h-4 w-4 mr-1" />
            Annuleren
          </Button>
          <Button
            onClick={handleSave}
            disabled={
              updateMutation.isPending || editedText === transcriptionText
            }
          >
            <Save className="h-4 w-4 mr-1" />
            {updateMutation.isPending ? "Opslaan..." : "Opslaan"}
          </Button>
        </div>
      </div>
    </div>
  );
}

