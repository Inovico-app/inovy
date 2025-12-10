"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { useOnboardingActions } from "../hooks/use-onboarding-actions";
import { useOnboardingSteps, type Step } from "../hooks/use-onboarding-steps";
import {
  onboardingFormSchema,
  type OnboardingFormValues,
} from "../schemas/onboarding-form.schema";
import { IndividualOnboardingFlow } from "./individual-onboarding-flow";
import { OnboardingNavigation } from "./onboarding-navigation";
import { OnboardingProgress } from "./onboarding-progress";
import { OrganizationOnboardingFlow } from "./organization-onboarding-flow";

interface OnboardingStepFormProps {
  onboardingId: string;
  initialData?: {
    name?: string | null;
    signupType?: "individual" | "organization";
    organizationName?: string | null;
    orgSize?: number | null;
    researchQuestion?: string | null;
    referralSource?: string | null;
    referralSourceOther?: string | null;
    newsletterOptIn?: boolean | null;
  };
}

export function OnboardingStepForm({
  onboardingId,
  initialData,
}: OnboardingStepFormProps) {
  const [currentStep, setCurrentStep] = useState<Step>(1);

  // Don't initialize completed steps from initialData - track them dynamically as user navigates
  // This ensures the current step is never marked as completed
  const [completedSteps, setCompletedSteps] = useState<Set<Step>>(new Set());

  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingFormSchema),
    defaultValues: {
      name: initialData?.name ?? "",
      signupType: initialData?.signupType ?? "individual",
      organizationName: initialData?.organizationName ?? "",
      orgSize: initialData?.orgSize ?? undefined,
      researchQuestion: initialData?.researchQuestion ?? "",
      referralSource: initialData?.referralSource ?? "",
      referralSourceOther: initialData?.referralSourceOther ?? undefined,
      newsletterOptIn: initialData?.newsletterOptIn ?? true,
      inviteEmails: "",
    },
    mode: "onChange",
  });

  const formData = form.watch();
  const { getNextStep, getPreviousStep, getVisibleSteps, canProceed } =
    useOnboardingSteps(currentStep, formData, completedSteps);

  // Wrapper to mark previous step as completed when moving to next step
  const handleStepChange = (newStep: Step) => {
    // Mark the previous step as completed when successfully moving to next step
    if (newStep !== currentStep) {
      setCompletedSteps((prev) => new Set(prev).add(currentStep));
    }
    setCurrentStep(newStep);
  };

  const {
    handleStepAction,
    handleSkip,
    handleInviteColleagues,
    isLoading,
    isCompleting,
  } = useOnboardingActions({
    onboardingId,
    formData,
    currentStep,
    onStepChange: handleStepChange,
    getNextStep,
  });

  const handleNext = async () => {
    const isValid = await form.trigger();
    if (isValid) {
      handleStepAction(currentStep);
    }
  };

  const handleBack = () => {
    if (currentStep === 1) {
      return;
    }
    const previousStep = getPreviousStep();
    // Remove current step from completed steps when going back
    // This ensures completedSteps always aligns with the step we are at
    setCompletedSteps((prev) => {
      const newSet = new Set(prev);
      newSet.delete(currentStep);
      return newSet;
    });
    setCurrentStep(previousStep);
  };

  const handleSubmit = async () => {
    const isValid = await form.trigger();
    if (isValid) {
      setCompletedSteps((prev) => new Set(prev).add(7));
      handleStepAction(7);
    }
  };

  const visibleSteps = getVisibleSteps();
  const shouldShowSkip =
    (currentStep === 3 &&
      formData.signupType === "individual" &&
      !formData.researchQuestion) ||
    currentStep === 4 ||
    currentStep === 9;

  const shouldShowInvite = currentStep === 9;

  return (
    <FormProvider {...form}>
      <div className="w-full max-w-2xl mx-auto space-y-8">
        <OnboardingProgress
          steps={visibleSteps}
          currentStep={currentStep}
          completedSteps={completedSteps}
        />

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {formData.signupType === "individual" && (
            <IndividualOnboardingFlow
              currentStep={currentStep}
              isLoading={isLoading}
            />
          )}

          {formData.signupType === "organization" && (
            <OrganizationOnboardingFlow
              currentStep={currentStep}
              isLoading={isLoading}
            />
          )}

          <OnboardingNavigation
            currentStep={currentStep}
            isLoading={isLoading}
            isCompleting={isCompleting}
            canProceed={canProceed()}
            onBack={handleBack}
            onNext={handleNext}
            onSkip={
              shouldShowSkip
                ? () => {
                    handleSkip(currentStep);
                  }
                : undefined
            }
            onInvite={shouldShowInvite ? handleInviteColleagues : undefined}
            showSkip={shouldShowSkip}
            showInvite={shouldShowInvite}
          />
        </form>
      </div>
    </FormProvider>
  );
}

