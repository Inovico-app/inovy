"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef } from "react";
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

function StepTransition({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Focus the first interactive element when the step mounts/transitions in
    const timer = setTimeout(() => {
      const element = ref.current?.querySelector(
        'input, select, textarea, button[type="submit"]'
      );
      if (element instanceof HTMLElement) {
        element.focus();
      }
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
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

