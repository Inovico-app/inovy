"use client";

import { Activity } from "react";
import type { Step } from "../hooks/use-onboarding-steps";
import { StepAccountType } from "./steps/step-account-type";
import { StepInviteColleagues } from "./steps/step-invite-colleagues";
import { StepName } from "./steps/step-name";
import { StepNewsletter } from "./steps/step-newsletter";
import { StepOrganizationName } from "./steps/step-organization-name";
import { StepOrganizationSize } from "./steps/step-organization-size";
import { StepReferralSource } from "./steps/step-referral-source";

interface OrganizationOnboardingFlowProps {
  currentStep: Step;
  isLoading: boolean;
}

export function OrganizationOnboardingFlow({
  currentStep,
  isLoading,
}: OrganizationOnboardingFlowProps) {
  return (
    <>
      <Activity mode={currentStep === 1 ? "visible" : "hidden"}>
        <StepName isLoading={isLoading} />
      </Activity>

      <Activity mode={currentStep === 2 ? "visible" : "hidden"}>
        <StepAccountType />
      </Activity>

      <Activity mode={currentStep === 8 ? "visible" : "hidden"}>
        <StepOrganizationName isLoading={isLoading} />
      </Activity>

      <Activity mode={currentStep === 5 ? "visible" : "hidden"}>
        <StepOrganizationSize isLoading={isLoading} />
      </Activity>

      <Activity mode={currentStep === 9 ? "visible" : "hidden"}>
        <StepInviteColleagues isLoading={isLoading} />
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

