"use client";

import { AnimatePresence } from "motion/react";
import { useGoogleConnection } from "../hooks/use-google-connection";
import type { Step } from "../hooks/use-onboarding-steps";
import { StepTransition } from "./step-transition";
import { StepAccountType } from "./steps/step-account-type";
import { StepCalendar } from "./steps/step-calendar";
import { StepName } from "./steps/step-name";
import { StepNewsletter } from "./steps/step-newsletter";
import { StepReferralSource } from "./steps/step-referral-source";
import { StepResearchQuestion } from "./steps/step-research-question";

interface IndividualOnboardingFlowProps {
  currentStep: Step;
  isLoading: boolean;
}

export function IndividualOnboardingFlow({
  currentStep,
  isLoading,
}: IndividualOnboardingFlowProps) {
  const {
    googleConnected,
    checkingGoogleStatus,
    handleConnectGoogle,
    showPermissionDialog,
    handlePermissionDialogChange,
  } = useGoogleConnection(currentStep);

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
          <StepCalendar
            googleConnected={googleConnected}
            checkingGoogleStatus={checkingGoogleStatus}
            onConnectGoogle={handleConnectGoogle}
            showPermissionDialog={showPermissionDialog}
            onPermissionDialogChange={handlePermissionDialogChange}
          />
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

