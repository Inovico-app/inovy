"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Edit2 } from "lucide-react";
import { useState } from "react";
import { TranscriptionHistoryDialog } from "../transcription-history-dialog";
import { TranscriptionMessageView } from "./transcription-message-view";
import type { TranscriptionTabsProps } from "./types";

export function TranscriptionTabs({
  utterances,
  transcriptionText,
  recordingId,
  isManuallyEdited,
  lastEditedAt,
  speakersDetected,
  confidence,
  onEditStart,
}: TranscriptionTabsProps) {
  const [activeTab, setActiveTab] = useState("simple");

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

  const hasUtterances = utterances && utterances.length > 0;

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

            <Button
              variant="ghost"
              size="sm"
              onClick={handleExport}
              title="Exporteer transcriptie"
            >
              <Download className="h-4 w-4" />
            </Button>
            <TranscriptionHistoryDialog recordingId={recordingId} />
            <Button variant="outline" size="sm" onClick={onEditStart}>
              <Edit2 className="h-4 w-4 mr-1" />
              Bewerken
            </Button>
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
      <CardContent>
        {hasUtterances ? (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="simple">Simpel</TabsTrigger>
              <TabsTrigger value="detailed">Gedetailleerd</TabsTrigger>
            </TabsList>

            <TabsContent value="simple" className="mt-4">
              <TranscriptionMessageView
                utterances={utterances}
                viewMode="simple"
                speakersDetected={speakersDetected}
              />
            </TabsContent>

            <TabsContent value="detailed" className="mt-4">
              <TranscriptionMessageView
                utterances={utterances}
                viewMode="detailed"
                speakersDetected={speakersDetected}
              />
            </TabsContent>
          </Tabs>
        ) : (
          <div className="p-4 rounded-lg bg-muted/50">
            <p className="text-sm whitespace-pre-wrap">{transcriptionText}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

