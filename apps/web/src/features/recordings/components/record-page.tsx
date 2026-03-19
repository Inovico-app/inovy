"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { AudioSource } from "@/features/recordings/core/recording-session.types";
import { useAudioCapabilities } from "@/features/recordings/hooks/use-audio-capabilities";
import type { UseRecordingSessionConfig } from "@/features/recordings/hooks/use-recording-session";
import type { ProjectWithCreatorDto } from "@/server/dto/project.dto";
import { ConsentBanner } from "@/features/recordings/components/consent-banner";
import { RecordingSession } from "@/features/recordings/components/recording-session/recording-session";
import {
  FolderIcon,
  InfoIcon,
  Mic,
  Monitor,
  Combine,
  Sparkles,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";

interface RecordPageProps {
  projects: ProjectWithCreatorDto[];
  organizationId: string;
  userId: string;
  projectIdFromParams?: string;
}

const AUDIO_SOURCE_OPTIONS: Array<{
  value: AudioSource;
  label: string;
  description: string;
  icon: typeof Mic;
  requiresSystem: boolean;
}> = [
  {
    value: "microphone",
    label: "Microfoon",
    description: "Alleen microfoonaudio",
    icon: Mic,
    requiresSystem: false,
  },
  {
    value: "system",
    label: "Systeemaudio",
    description: "Alleen computersgeluid",
    icon: Monitor,
    requiresSystem: true,
  },
  {
    value: "combined",
    label: "Beide",
    description: "Microfoon + systeemaudio",
    icon: Combine,
    requiresSystem: true,
  },
];

export function RecordPage({
  projects,
  organizationId,
  userId,
  projectIdFromParams,
}: RecordPageProps) {
  const capabilities = useAudioCapabilities();

  const hasProjects = projects.length > 0 || !!projectIdFromParams;

  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    projectIdFromParams ?? projects[0]?.id ?? "",
  );

  if (!hasProjects) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <p className="text-muted-foreground">
          Maak eerst een project aan om een opname te starten.
        </p>
      </div>
    );
  }
  const [audioSource, setAudioSource] = useState<AudioSource>("microphone");
  const [liveTranscriptionEnabled, setLiveTranscriptionEnabled] =
    useState(true);

  // Consent flow
  const [showConsentBanner, setShowConsentBanner] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);
  const [consentGivenAt, setConsentGivenAt] = useState<string | null>(null);

  // Config key forces RecordingSession to remount when config changes
  const configKey = useMemo(
    () =>
      `${selectedProjectId}-${audioSource}-${liveTranscriptionEnabled}-${consentGivenAt}`,
    [selectedProjectId, audioSource, liveTranscriptionEnabled, consentGivenAt],
  );

  const showProjectSelector = projectIdFromParams === undefined;
  const effectiveProjectId = projectIdFromParams ?? selectedProjectId;

  const availableSources = useMemo(
    () =>
      AUDIO_SOURCE_OPTIONS.filter(
        (opt) => !opt.requiresSystem || capabilities.hasSystemAudio,
      ),
    [capabilities.hasSystemAudio],
  );

  const handleRequestConsent = useCallback(() => {
    setShowConsentBanner(true);
  }, []);

  const handleConsentGranted = useCallback(() => {
    setConsentGiven(true);
    setConsentGivenAt(new Date().toISOString());
    setShowConsentBanner(false);
  }, []);

  const handleConsentDenied = useCallback(() => {
    setShowConsentBanner(false);
  }, []);

  const sessionConfig = useMemo<UseRecordingSessionConfig>(
    () => ({
      projectId: effectiveProjectId,
      organizationId,
      userId,
      audioSource,
      language: "nl",
      liveTranscriptionEnabled,
      consent: {
        consentGiven,
        consentGivenAt,
      },
    }),
    [
      effectiveProjectId,
      organizationId,
      userId,
      audioSource,
      liveTranscriptionEnabled,
      consentGiven,
      consentGivenAt,
    ],
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-1 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Opname starten
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            Neem audio op vanuit uw browser met optionele live transcriptie
          </p>
        </div>

        {/* Project selector + settings */}
        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          {showProjectSelector && (
            <div className="flex items-center gap-2">
              <Label
                htmlFor="project-select-new"
                className="text-sm font-medium flex items-center gap-1.5 text-muted-foreground whitespace-nowrap"
              >
                <FolderIcon className="w-4 h-4" />
                Project
              </Label>
              <Select
                value={selectedProjectId}
                onValueChange={(value) => setSelectedProjectId(value ?? "")}
                disabled={consentGiven}
              >
                <SelectTrigger
                  id="project-select-new"
                  className="w-[200px] sm:w-[240px]"
                  aria-label="Selecteer een project voor deze opname"
                >
                  <SelectValue placeholder="Selecteer een project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      <div className="flex flex-col items-start gap-0.5">
                        <span className="font-medium leading-tight">
                          {project.name}
                        </span>
                        {project.description && (
                          <span className="text-muted-foreground text-xs leading-tight">
                            {project.description}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      {/* Pre-recording settings (visible before consent) */}
      {!consentGiven && effectiveProjectId && (
        <div className="rounded-2xl border bg-gradient-to-br from-card via-card to-card/50 shadow-md p-6 space-y-5">
          <div>
            <h2 className="text-lg font-semibold tracking-tight mb-1">
              Opname-instellingen
            </h2>
            <p className="text-sm text-muted-foreground">
              Configureer de instellingen voordat u de opname start
            </p>
          </div>

          {/* Audio source selector */}
          <fieldset className="space-y-3">
            <legend className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Audiobron
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {availableSources.map((opt) => {
                const Icon = opt.icon;
                const isSelected = audioSource === opt.value;

                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setAudioSource(opt.value)}
                    className={`relative flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-all duration-200 ${
                      isSelected
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border hover:border-primary/30 hover:bg-muted/30"
                    }`}
                    aria-pressed={isSelected}
                  >
                    <div
                      className={`mt-0.5 rounded-lg p-2 ${
                        isSelected
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-sm font-medium block">
                        {opt.label}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {opt.description}
                      </span>
                    </div>
                    {isSelected && (
                      <span className="absolute top-2 right-2 size-2 rounded-full bg-primary" />
                    )}
                  </button>
                );
              })}
            </div>
          </fieldset>

          {/* Live transcription toggle */}
          <div className="space-y-2">
            <Label
              htmlFor="transcription-toggle-new"
              className="flex flex-col gap-2 rounded-xl border p-4 bg-muted/20 cursor-pointer hover:bg-muted/40 transition-colors focus-within:ring-2 focus-within:ring-ring"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <Sparkles className="w-4 h-4" aria-hidden="true" />
                    Live transcriptie
                  </span>
                  <Badge
                    variant={liveTranscriptionEnabled ? "default" : "outline"}
                    className="text-xs shrink-0"
                    aria-hidden="true"
                  >
                    {liveTranscriptionEnabled ? "Aan" : "Uit"}
                  </Badge>
                </div>
                <Switch
                  id="transcription-toggle-new"
                  checked={liveTranscriptionEnabled}
                  onCheckedChange={setLiveTranscriptionEnabled}
                  aria-label={`Live transcriptie is ${liveTranscriptionEnabled ? "ingeschakeld" : "uitgeschakeld"}`}
                  className="shrink-0"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Spraak wordt in real-time omgezet naar tekst tijdens de opname
              </p>
            </Label>
          </div>

          {/* Start / consent button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleRequestConsent}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/25 transition-all duration-200 hover:shadow-xl hover:shadow-primary/35 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Mic className="w-4 h-4" />
              Doorgaan naar opname
            </button>
          </div>
        </div>
      )}

      {/* No project selected */}
      {!effectiveProjectId && (
        <Alert>
          <InfoIcon className="h-4 w-4" />
          <AlertDescription>
            Selecteer een project om te beginnen met opnemen
          </AlertDescription>
        </Alert>
      )}

      {/* Recording session (after consent) */}
      {consentGiven && effectiveProjectId && (
        <RecordingSession key={configKey} config={sessionConfig} />
      )}

      {/* Consent dialog */}
      <ConsentBanner
        isOpen={showConsentBanner}
        onConsentGranted={handleConsentGranted}
        onConsentDenied={handleConsentDenied}
      />
    </div>
  );
}
