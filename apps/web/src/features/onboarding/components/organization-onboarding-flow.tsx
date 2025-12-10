"use client";

import { AnimatePresence } from "motion/react";
import type { Step } from "../hooks/use-onboarding-steps";
import { StepAccountType } from "./steps/step-account-type";
import { StepInviteColleagues } from "./steps/step-invite-colleagues";
import { StepName } from "./steps/step-name";
import { StepNewsletter } from "./steps/step-newsletter";
import { StepOrganizationName } from "./steps/step-organization-name";
import { StepOrganizationSize } from "./steps/step-organization-size";
import { StepReferralSource } from "./steps/step-referral-source";
import { StepTransition } from "./step-transition";

interface OrganizationOnboardingFlowProps {
  currentStep: Step;
  isLoading: boolean;
}

export function OrganizationOnboardingFlow({
  currentStep,
  isLoading,
}: OrganizationOnboardingFlowProps) {
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

      {currentStep === 8 && (
        <StepTransition key="step8">
          <StepOrganizationName isLoading={isLoading} />
        </StepTransition>
      )}

      {currentStep === 5 && (
        <StepTransition key="step5">
          <StepOrganizationSize isLoading={isLoading} />
        </StepTransition>
      )}

      {currentStep === 9 && (
        <StepTransition key="step9">
          <StepInviteColleagues isLoading={isLoading} />
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

