import type { OnboardingFormValues } from "../schemas/onboarding-form.schema";

export type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export const STEPS: Array<{ number: Step; title: string }> = [
  { number: 1, title: "Naam" },
  { number: 2, title: "Account Type" },
  { number: 3, title: "Onderzoeksvraag" },
  { number: 4, title: "Agenda" },
  { number: 5, title: "Organization Size" },
  { number: 6, title: "Hoe heb je over ons gehoord?" },
  { number: 7, title: "Nieuwsbrief" },
  { number: 8, title: "Je organisatie" },
  { number: 9, title: "Nodig collega's uit" },
];

// Define the flow paths for each signup type
const INDIVIDUAL_FLOW: Step[] = [1, 2, 3, 4, 6, 7];
const ORGANIZATION_FLOW: Step[] = [1, 2, 8, 5, 9, 6, 7];

export function useOnboardingSteps(
  currentStep: Step,
  formData: OnboardingFormValues,
  completedSteps: Set<Step>
) {
  const flow =
    formData.signupType === "individual" ? INDIVIDUAL_FLOW : ORGANIZATION_FLOW;

  const getNextStep = (): Step => {
    const currentIndex = flow.indexOf(currentStep);
    if (currentIndex === -1 || currentIndex === flow.length - 1) {
      return 7; // Default to final step
    }
    return flow[currentIndex + 1];
  };

  const getPreviousStep = (): Step => {
    const currentIndex = flow.indexOf(currentStep);
    if (currentIndex <= 0) {
      return 1; // Default to first step
    }
    return flow[currentIndex - 1];
  };

  const getVisibleSteps = () => {
    // Return steps in the order they appear in the flow, not filtered by step number
    return flow.map((stepNumber) => {
      const step = STEPS.find((s) => s.number === stepNumber);
      return step!; // Safe because flow only contains valid step numbers
    });
  };

  const canProceed = (): boolean => {
    if (currentStep === 1) {
      return !!formData.name && formData.name.trim().length > 0;
    }
    if (currentStep === 2) {
      return !!formData.signupType;
    }
    if (currentStep === 3) {
      return true;
    }
    if (currentStep === 4) {
      return true;
    }
    if (currentStep === 5) {
      return !!formData.orgSize && formData.orgSize > 0;
    }
    if (currentStep === 6) {
      return true;
    }
    if (currentStep === 7) {
      return true;
    }
    if (currentStep === 8) {
      return (
        !!formData.organizationName &&
        formData.organizationName.trim().length > 0
      );
    }
    return false;
  };

  const isStepCompleted = (step: Step): boolean => {
    return completedSteps.has(step);
  };

  return {
    getNextStep,
    getPreviousStep,
    getVisibleSteps,
    canProceed,
    isStepCompleted,
  };
}

