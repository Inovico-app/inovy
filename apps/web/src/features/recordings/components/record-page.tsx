"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Settings2,
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

        {/* Project selector + settings dropdown */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
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

          {/* Settings dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger
              disabled={consentGiven}
              className="inline-flex items-center justify-center gap-1.5 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
            >
              <Settings2 className="w-4 h-4" />
              Instellingen
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Audiobron</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={audioSource}
                onValueChange={(value) => setAudioSource(value as AudioSource)}
              >
                {availableSources.map((opt) => {
                  const Icon = opt.icon;
                  return (
                    <DropdownMenuRadioItem key={opt.value} value={opt.value}>
                      <Icon className="w-4 h-4 mr-1.5" />
                      <span>{opt.label}</span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {opt.description}
                      </span>
                    </DropdownMenuRadioItem>
                  );
                })}
              </DropdownMenuRadioGroup>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Transcriptie</DropdownMenuLabel>
              <DropdownMenuCheckboxItem
                checked={liveTranscriptionEnabled}
                onCheckedChange={setLiveTranscriptionEnabled}
              >
                <Sparkles className="w-4 h-4 mr-1.5" />
                Live transcriptie
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Start button (visible before consent) */}
      {!consentGiven && effectiveProjectId && (
        <div>
          <button
            type="button"
            onClick={handleRequestConsent}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/25 transition-all duration-200 hover:shadow-xl hover:shadow-primary/35 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Mic className="w-4 h-4" />
            Opname starten
          </button>
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
