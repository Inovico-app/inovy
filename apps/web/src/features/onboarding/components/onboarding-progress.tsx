import type { Step } from "../hooks/use-onboarding-steps";

interface OnboardingProgressProps {
  steps: Array<{ number: Step; title: string }>;
  currentStep: Step;
  completedSteps: Set<Step>;
}

export function OnboardingProgress({
  steps,
  currentStep,
  completedSteps,
}: OnboardingProgressProps) {
  return (
    <div className="flex items-center gap-2">
      {steps.map((step, index) => {
        const isActive = currentStep === step.number;
        const isCompleted = completedSteps.has(step.number);
        const isLast = index === steps.length - 1;

        return (
          <div key={step.number} className="flex items-center flex-1">
            <div
              className={`flex-1 h-1 rounded-full transition-colors ${
                isCompleted || isActive ? "bg-primary" : "bg-muted"
              }`}
            />
            {!isLast && <div className="w-2" />}
          </div>
        );
      })}
    </div>
  );
}

