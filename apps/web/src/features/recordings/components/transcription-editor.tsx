"use client";

import { useState } from "react";
import { Edit2, Save, X, Download, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUpdateTranscriptionMutation } from "../hooks/use-update-transcription-mutation";
import { TranscriptionHistoryDialog } from "./transcription-history-dialog";

interface TranscriptionEditorProps {
  recordingId: string;
  transcriptionText: string;
  isManuallyEdited?: boolean;
  _lastEditedById?: string | null;
  lastEditedAt?: Date | null;
  speakersDetected?: number;
  confidence?: number;
}

export function TranscriptionEditor({
  recordingId,
  transcriptionText,
  isManuallyEdited,
  _lastEditedById,
  lastEditedAt,
  speakersDetected,
  confidence,
}: TranscriptionEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(transcriptionText);
  const [changeDescription, setChangeDescription] = useState("");
  const [showSearchReplace, setShowSearchReplace] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [replaceTerm, setReplaceTerm] = useState("");

  const updateMutation = useUpdateTranscriptionMutation({
    onSuccess: () => {
      setIsEditing(false);
      setChangeDescription("");
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
    setIsEditing(false);
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

  if (!transcriptionText) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Geen transcriptie beschikbaar
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle>Transcriptie</CardTitle>
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

            {!isEditing && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleExport}
                  title="Exporteer transcriptie"
                >
                  <Download className="h-4 w-4" />
                </Button>
                <TranscriptionHistoryDialog recordingId={recordingId} />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit2 className="h-4 w-4 mr-1" />
                  Bewerken
                </Button>
              </>
            )}
          </div>
        </div>
        {lastEditedAt && (
          <p className="text-xs text-muted-foreground mt-2">
            Laatst bewerkt op{" "}
            {new Date(lastEditedAt).toLocaleString("nl-NL", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {isEditing ? (
          <div className="space-y-4">
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
            <div className="flex justify-end gap-2">
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
        ) : (
          <div className="p-4 rounded-lg bg-muted/50">
            <p className="text-sm whitespace-pre-wrap">{transcriptionText}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

