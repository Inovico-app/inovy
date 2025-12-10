"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef } from "react";
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
    }, 100); // Small delay to allow animation to start/render

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

export function IndividualOnboardingFlow({
  currentStep,
  isLoading,
}: IndividualOnboardingFlowProps) {
  const { googleConnected, checkingGoogleStatus, handleConnectGoogle } =
    useGoogleConnection(currentStep);

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

