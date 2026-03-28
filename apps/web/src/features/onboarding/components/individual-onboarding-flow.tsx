"use client";

import { AnimatePresence } from "motion/react";
import { useGoogleConnection } from "../hooks/use-google-connection";
import { useMicrosoftConnection } from "../hooks/use-microsoft-connection";
import type { Step } from "../hooks/use-onboarding-steps";
import { StepTransition } from "./step-transition";
import { StepAccountType } from "./steps/step-account-type";
import { StepCalendar } from "./steps/step-calendar";
import { StepName } from "./steps/step-name";
import { StepNewsletter } from "./steps/step-newsletter";
import { StepReferralSource } from "./steps/step-referral-source";
import { StepResearchQuestion } from "./steps/step-research-question";

type CalendarProvider = "google" | "microsoft";

interface IndividualOnboardingFlowProps {
  currentStep: Step;
  isLoading: boolean;
  signupMethod?: string;
}

export function IndividualOnboardingFlow({
  currentStep,
  isLoading,
  signupMethod,
}: IndividualOnboardingFlowProps) {
  const calendarProvider: CalendarProvider =
    signupMethod === "microsoft" ? "microsoft" : "google";

  const google = useGoogleConnection(currentStep);
  const microsoft = useMicrosoftConnection(currentStep);

  const calendarProps =
    calendarProvider === "microsoft"
      ? {
          provider: "microsoft" as const,
          connected: microsoft.microsoftConnected,
          checkingStatus: microsoft.checkingMicrosoftStatus,
          onConnect: microsoft.handleConnectMicrosoft,
          showPermissionDialog: microsoft.showPermissionDialog,
          onPermissionDialogChange: microsoft.setShowPermissionDialog,
        }
      : {
          provider: "google" as const,
          connected: google.googleConnected,
          checkingStatus: google.checkingGoogleStatus,
          onConnect: google.handleConnectGoogle,
          showPermissionDialog: google.showPermissionDialog,
          onPermissionDialogChange: google.setShowPermissionDialog,
        };

  return (
    <AnimatePresence mode="wait">
      {currentStep === 1 && (
        <StepTransition key="step1">
          <StepName isLoading={isLoading} />
        </StepTransition>
      )}

      {currentStep === 2 && (
        <StepTransition key="step2">
          <StepAccountType />
        </StepTransition>
      )}

      {currentStep === 3 && (
        <StepTransition key="step3">
          <StepResearchQuestion isLoading={isLoading} />
        </StepTransition>
      )}

      {currentStep === 4 && (
        <StepTransition key="step4">
          <StepCalendar {...calendarProps} />
        </StepTransition>
      )}

      {currentStep === 6 && (
        <StepTransition key="step6">
          <StepReferralSource isLoading={isLoading} />
        </StepTransition>
      )}

      {currentStep === 7 && (
        <StepTransition key="step7">
          <StepNewsletter isLoading={isLoading} />
        </StepTransition>
      )}
    </AnimatePresence>
  );
}
