"use client";

import { Activity } from "react";
import { useGoogleConnection } from "../hooks/use-google-connection";
import type { Step } from "../hooks/use-onboarding-steps";
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
  const { googleConnected, checkingGoogleStatus, handleConnectGoogle } =
    useGoogleConnection(currentStep);

  return (
    <>
      <Activity mode={currentStep === 1 ? "visible" : "hidden"}>
        <StepName isLoading={isLoading} />
      </Activity>

      <Activity mode={currentStep === 2 ? "visible" : "hidden"}>
        <StepAccountType />
      </Activity>

      <Activity mode={currentStep === 3 ? "visible" : "hidden"}>
        <StepResearchQuestion isLoading={isLoading} />
      </Activity>

      <Activity mode={currentStep === 4 ? "visible" : "hidden"}>
        <StepCalendar
          googleConnected={googleConnected}
          checkingGoogleStatus={checkingGoogleStatus}
          onConnectGoogle={handleConnectGoogle}
        />
      </Activity>

      <Activity mode={currentStep === 6 ? "visible" : "hidden"}>
        <StepReferralSource isLoading={isLoading} />
      </Activity>

      <Activity mode={currentStep === 7 ? "visible" : "hidden"}>
        <StepNewsletter isLoading={isLoading} />
      </Activity>
    </>
  );
}

