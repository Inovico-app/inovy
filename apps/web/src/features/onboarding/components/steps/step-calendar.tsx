"use client";

import { Button } from "@/components/ui/button";
import { PermissionExplanationDialog } from "@/features/integrations/google/components/permission-explanation-dialog";
import { MsIncrementalPermissionDialog } from "@/features/integrations/microsoft/components/incremental-permission-dialog";
import { Calendar, CheckCircle2, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useUpcomingMeetings } from "../../hooks/use-upcoming-meetings";
import { UpcomingMeetingsList } from "../upcoming-meetings-list";

type CalendarProvider = "google" | "microsoft";

interface StepCalendarProps {
  provider: CalendarProvider;
  connected: boolean;
  checkingStatus: boolean;
  onConnect: () => void;
  showPermissionDialog: boolean;
  onPermissionDialogChange: (open: boolean) => void;
}

function GoogleIcon() {
  return (
    <svg
      className="h-6 w-6"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg
      className="h-6 w-6"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="1" y="1" width="10" height="10" fill="#F25022" />
      <rect x="13" y="1" width="10" height="10" fill="#7FBA00" />
      <rect x="1" y="13" width="10" height="10" fill="#00A4EF" />
      <rect x="13" y="13" width="10" height="10" fill="#FFB900" />
    </svg>
  );
}

function CalendarConnectButton({
  provider,
  onConnect,
  t,
}: {
  provider: CalendarProvider;
  onConnect: () => void;
  t: ReturnType<typeof useTranslations<"onboarding">>;
}) {
  return (
    <Button
      type="button"
      onClick={onConnect}
      className="w-full p-4 h-auto flex items-center gap-4 justify-start"
      variant="outline"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded">
        {provider === "microsoft" ? <MicrosoftIcon /> : <GoogleIcon />}
      </div>
      <span className="font-medium">
        {provider === "microsoft"
          ? t("stepCalendarMicrosoftButton")
          : t("stepCalendarGoogleButton")}
      </span>
    </Button>
  );
}

export function StepCalendar({
  provider,
  connected,
  checkingStatus,
  onConnect,
  showPermissionDialog,
  onPermissionDialogChange,
}: StepCalendarProps): React.ReactNode {
  const t = useTranslations("onboarding");
  const {
    meetings,
    isLoading: isLoadingMeetings,
    toggleMeetingRecording,
    toggleAllRecordings,
  } = useUpcomingMeetings(connected);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex justify-center mb-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Calendar className="h-8 w-8 text-primary" />
          </div>
        </div>
        <h2 className="text-2xl font-semibold text-center">
          {t("stepCalendarTitle")}
        </h2>
        <p className="text-muted-foreground text-center">
          {t("stepCalendarSubtitle")}
        </p>
      </div>

      <div className="space-y-4">
        {checkingStatus && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!checkingStatus && !connected && (
          <CalendarConnectButton
            provider={provider}
            onConnect={onConnect}
            t={t}
          />
        )}

        {connected && !checkingStatus && (
          <>
            <div className="flex items-center justify-center gap-2 p-4 rounded-lg border bg-primary/5 border-primary/20">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">
                {provider === "microsoft"
                  ? t("stepCalendarConnectedMicrosoft")
                  : t("stepCalendarConnectedGoogle")}
              </span>
            </div>

            <UpcomingMeetingsList
              meetings={meetings}
              isLoading={isLoadingMeetings}
              onToggleRecording={toggleMeetingRecording}
              onToggleAll={toggleAllRecordings}
            />
          </>
        )}
      </div>

      {provider === "google" && (
        <PermissionExplanationDialog
          open={showPermissionDialog}
          onOpenChange={onPermissionDialogChange}
          tiers={["base"]}
          redirectUrl="/onboarding?google_connected=true"
        />
      )}

      {provider === "microsoft" && (
        <MsIncrementalPermissionDialog
          open={showPermissionDialog}
          onOpenChange={onPermissionDialogChange}
          tier="base"
          returnUrl="/onboarding?microsoft_connected=true"
        />
      )}
    </div>
  );
}
