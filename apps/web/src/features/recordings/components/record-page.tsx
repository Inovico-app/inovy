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

  const selectedAudioLabel =
    AUDIO_SOURCE_OPTIONS.find((o) => o.value === audioSource)?.label ??
    "Microfoon";

  // Active recording view — full width, no hero
  if (consentGiven && effectiveProjectId) {
    return (
      <>
        <RecordingSession
          key={configKey}
          config={sessionConfig}
          autoStart
          onDiscard={() => {
            setConsentGiven(false);
            setConsentGivenAt(null);
          }}
        />
        <ConsentBanner
          isOpen={showConsentBanner}
          onConsentGranted={handleConsentGranted}
          onConsentDenied={handleConsentDenied}
        />
      </>
    );
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-10rem)]">
      {/* Top bar — project + settings */}
      <div className="flex items-center justify-between gap-3 pb-6">
        {showProjectSelector ? (
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
            >
              <SelectTrigger
                id="project-select-new"
                className="w-[200px] sm:w-[240px]"
                aria-label="Selecteer een project voor deze opname"
              >
                <SelectValue placeholder="Selecteer een project">
                  {(value: string | null) => {
                    const project = projects.find((p) => p.id === value);
                    return project?.name ?? "Selecteer een project";
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem
                    key={project.id}
                    value={project.id}
                    label={project.name}
                  >
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div />
        )}

        {/* Settings dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex items-center justify-center gap-1.5 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground">
            <Settings2 className="w-4 h-4" />
            <span className="hidden sm:inline">Instellingen</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72 p-2">
            <DropdownMenuLabel className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">
              Audiobron
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={audioSource}
              onValueChange={(value) => setAudioSource(value as AudioSource)}
            >
              {availableSources.map((opt) => {
                const Icon = opt.icon;
                return (
                  <DropdownMenuRadioItem
                    key={opt.value}
                    value={opt.value}
                    className="flex items-start gap-2.5 rounded-md px-2 py-2"
                  >
                    <div className="mt-0.5 shrink-0 rounded-md bg-muted p-1.5">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-sm font-medium leading-tight">
                        {opt.label}
                      </span>
                      <span className="text-[11px] leading-tight text-muted-foreground">
                        {opt.description}
                      </span>
                    </div>
                  </DropdownMenuRadioItem>
                );
              })}
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator className="my-2" />
            <DropdownMenuLabel className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">
              Transcriptie
            </DropdownMenuLabel>
            <DropdownMenuCheckboxItem
              checked={liveTranscriptionEnabled}
              onCheckedChange={setLiveTranscriptionEnabled}
              className="flex items-start gap-2.5 rounded-md px-2 py-2"
            >
              <div className="mt-0.5 shrink-0 rounded-md bg-muted p-1.5">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-sm font-medium leading-tight">
                  Live transcriptie
                </span>
                <span className="text-[11px] leading-tight text-muted-foreground">
                  Real-time spraak naar tekst
                </span>
              </div>
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Hero — centered mic button */}
      <div className="flex-1 flex flex-col items-center justify-center gap-8 -mt-8">
        {effectiveProjectId ? (
          <>
            {/* Pulsing mic button */}
            <div className="relative">
              {/* Outer pulse rings */}
              <div className="absolute inset-0 -m-4 animate-ping rounded-full bg-primary/10 [animation-duration:2.5s]" />
              <div className="absolute inset-0 -m-2 animate-ping rounded-full bg-primary/5 [animation-duration:3s] [animation-delay:0.5s]" />

              <button
                type="button"
                onClick={handleRequestConsent}
                className="relative z-10 flex items-center justify-center size-28 sm:size-32 rounded-full bg-primary text-primary-foreground shadow-xl shadow-primary/30 transition-all duration-200 hover:shadow-2xl hover:shadow-primary/40 hover:scale-105 active:scale-95 focus-visible:ring-4 focus-visible:ring-ring"
                aria-label="Start opname"
              >
                <Mic className="size-10 sm:size-12" strokeWidth={1.5} />
              </button>
            </div>

            {/* Label */}
            <div className="text-center space-y-2">
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">
                Tik om op te nemen
              </h1>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                {selectedAudioLabel}
                {liveTranscriptionEnabled && " \u00B7 Live transcriptie"}
              </p>
            </div>
          </>
        ) : (
          /* No project selected state */
          <div className="text-center space-y-3">
            <div className="flex items-center justify-center size-20 rounded-full bg-muted/50 mx-auto">
              <Mic className="size-8 text-muted-foreground/50" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Geen project geselecteerd</p>
              <p className="text-sm text-muted-foreground">
                Selecteer een project om te beginnen met opnemen
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Consent dialog */}
      <ConsentBanner
        isOpen={showConsentBanner}
        onConsentGranted={handleConsentGranted}
        onConsentDenied={handleConsentDenied}
      />
    </div>
  );
}
