"use client";

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
import { useAudioDevices } from "@/features/recordings/hooks/use-audio-devices";
import type { UseRecordingSessionConfig } from "@/features/recordings/hooks/use-recording-session";
import type { ProjectWithCreatorDto } from "@/server/dto/project.dto";
import { ConsentBanner } from "@/features/recordings/components/consent-banner";
import { RecordingSession } from "@/features/recordings/components/recording-session/recording-session";
import {
  FolderIcon,
  Mic,
  Monitor,
  Combine,
  Settings2,
  Sparkles,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";

interface RecordPageProps {
  projects: ProjectWithCreatorDto[];
  organizationId: string;
  userId: string;
  projectIdFromParams?: string;
}

const AUDIO_SOURCE_OPTIONS: Array<{
  value: AudioSource;
  labelKey: string;
  descriptionKey: string;
  icon: typeof Mic;
  requiresSystem: boolean;
}> = [
  {
    value: "microphone",
    labelKey: "session.microphone",
    descriptionKey: "session.microphoneOnly",
    icon: Mic,
    requiresSystem: false,
  },
  {
    value: "system",
    labelKey: "session.systemAudio",
    descriptionKey: "session.systemAudioOnly",
    icon: Monitor,
    requiresSystem: true,
  },
  {
    value: "combined",
    labelKey: "session.combined",
    descriptionKey: "session.combinedDescription",
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
  const t = useTranslations("recordings");
  const capabilities = useAudioCapabilities();
  const { devices: audioDevices } = useAudioDevices();

  const hasProjects = projects.length > 0 || !!projectIdFromParams;

  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    projectIdFromParams ?? projects[0]?.id ?? "",
  );
  const [audioSource, setAudioSource] = useState<AudioSource>("microphone");
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("default");
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

  const selectedAudioLabelKey =
    AUDIO_SOURCE_OPTIONS.find((o) => o.value === audioSource)?.labelKey ??
    "session.microphone";
  const selectedAudioLabel = t(selectedAudioLabelKey);

  if (!hasProjects) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <p className="text-muted-foreground">
          {t("session.createProjectFirst")}
        </p>
      </div>
    );
  }

  // Active recording view — full width, no hero
  if (consentGiven && effectiveProjectId) {
    return (
      <>
        <RecordingSession
          key={configKey}
          config={sessionConfig}
          autoStart
          deviceId={
            selectedDeviceId === "default" ? undefined : selectedDeviceId
          }
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
                aria-label={t("session.selectProjectLabel")}
              >
                <SelectValue placeholder="Selecteer een project">
                  {(value: string | null) => {
                    const project = projects.find((p) => p.id === value);
                    return project?.name ?? t("session.selectProject");
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
            <span className="hidden sm:inline">{t("session.settings")}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72 p-2">
            <DropdownMenuLabel className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">
              {t("session.audioSource")}
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
                        {t(opt.labelKey)}
                      </span>
                      <span className="text-[11px] leading-tight text-muted-foreground">
                        {t(opt.descriptionKey)}
                      </span>
                    </div>
                  </DropdownMenuRadioItem>
                );
              })}
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator className="my-2" />
            <DropdownMenuLabel className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">
              {t("session.microphoneLabel")}
            </DropdownMenuLabel>
            <div className="px-2 py-1.5 space-y-1.5">
              <Select
                value={selectedDeviceId}
                onValueChange={(value) => {
                  if (value != null) setSelectedDeviceId(value);
                }}
              >
                <SelectTrigger
                  className="w-full"
                  aria-label={t("session.selectMicrophone")}
                >
                  <SelectValue placeholder={t("session.defaultMicrophone")}>
                    {selectedDeviceId === "default"
                      ? t("session.defaultMicrophone")
                      : (audioDevices.find(
                          (d) => d.deviceId === selectedDeviceId,
                        )?.label ?? t("session.defaultMicrophone"))}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    value="default"
                    label={t("session.defaultMicrophone")}
                  >
                    {t("session.defaultMicrophone")}
                  </SelectItem>
                  {audioDevices.map((device) => (
                    <SelectItem
                      key={device.deviceId}
                      value={device.deviceId}
                      label={device.label}
                    >
                      {device.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground/70">
                {t("session.cannotChangeDuringRecording")}
              </p>
            </div>
            <DropdownMenuSeparator className="my-2" />
            <DropdownMenuLabel className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">
              {t("session.transcription")}
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
                  {t("session.liveTranscription")}
                </span>
                <span className="text-[11px] leading-tight text-muted-foreground">
                  {t("session.realTimeSpeechToText")}
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
                aria-label={t("session.startRecordingAriaLabel")}
              >
                <Mic className="size-10 sm:size-12" strokeWidth={1.5} />
              </button>
            </div>

            {/* Label */}
            <div className="text-center space-y-2">
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">
                {t("session.tapToRecord")}
              </h1>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                {selectedAudioLabel}
                {selectedDeviceId !== "default" &&
                  ` \u00B7 ${audioDevices.find((d) => d.deviceId === selectedDeviceId)?.label ?? ""}`}
                {liveTranscriptionEnabled &&
                  ` \u00B7 ${t("session.liveTranscription")}`}
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
              <p className="text-sm font-medium">
                {t("session.noProjectSelected")}
              </p>
              <p className="text-sm text-muted-foreground">
                {t("session.selectProjectToStart")}
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
