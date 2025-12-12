import { inviteColleaguesAction } from "@/features/onboarding/actions/invite-colleagues";
import {
  completeOnboardingAction,
  updateOnboardingDataAction,
} from "@/features/onboarding/actions/onboarding";
import { authClient } from "@/lib/auth-client";
import { logger } from "@/lib/logger";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";
import type { OnboardingFormValues } from "../schemas/onboarding-form.schema";
import type { Step } from "./use-onboarding-steps";

interface UseOnboardingActionsProps {
  onboardingId: string;
  formData: OnboardingFormValues;
  currentStep: Step;
  onStepChange: (step: Step) => void;
  getNextStep: () => Step;
}

export function useOnboardingActions({
  onboardingId,
  formData,
  currentStep,
  onStepChange,
  getNextStep,
}: UseOnboardingActionsProps) {
  const { execute: updateData, isExecuting: isUpdating } = useAction(
    updateOnboardingDataAction,
    {
      onSuccess: () => {
        const nextStep = getNextStep();
        const lastStep = 7;

        const isIntermediateStep = nextStep === 8 || nextStep === 9;

        if (
          isIntermediateStep ||
          (nextStep < lastStep && nextStep !== currentStep)
        ) {
          onStepChange(nextStep);
        } else if (nextStep === lastStep && currentStep === lastStep) {
          completeOnboarding({
            onboardingId,
            name: formData.name,
            signupType: formData.signupType,
            orgSize:
              formData.signupType === "organization"
                ? formData.orgSize
                : undefined,
            researchQuestion:
              formData.signupType === "individual"
                ? formData.researchQuestion || undefined
                : undefined,
            referralSource: formData.referralSource || undefined,
            referralSourceOther:
              formData.referralSource === "other"
                ? formData.referralSourceOther || undefined
                : undefined,
            newsletterOptIn: formData.newsletterOptIn,
          });
        } else if (nextStep === lastStep && currentStep !== lastStep) {
          onStepChange(nextStep);
        }
      },
      onError: ({ error }) => {
        console.error("Update onboarding error:", error);
        toast.error(error.serverError || "Failed to save progress");
      },
    }
  );

  const { execute: completeOnboarding, isExecuting: isCompleting } = useAction(
    completeOnboardingAction,
    {
      onSuccess: async () => {
        // revoke all sessions and use a fresh one
        try {
          await authClient.revokeSessions();
          await authClient.getSession();
        } catch (error) {
          toast.error(
            "Failed to complete onboarding: revoking sessions failed"
          );
          logger.error("Revoke sessions error", {
            error,
            component: "useOnboardingActions",
            action: "completeOnboarding",
          });
        }
        toast.success("Welkom bij Inovy! Je onboarding is voltooid.");
        // Avoid push+refresh races and App Router prefetch cache issues (seen in prod)
        // by doing a single hard navigation after session/cookie mutations.
        window.location.assign("/");
      },
      onError: ({ error }) => {
        toast.error(error.serverError || "Failed to complete onboarding");
      },
    }
  );

  const { execute: inviteColleagues, isExecuting: isInviting } = useAction(
    inviteColleaguesAction,
    {
      onSuccess: (result) => {
        if (result?.data?.success) {
          const successCount = result.data.successCount;
          const failureCount = result.data.failureCount;
          if (failureCount === 0) {
            toast.success(
              `${successCount} ${successCount === 1 ? "uitnodiging" : "uitnodigingen"} verzonden`
            );
          } else {
            toast.success(
              `${successCount} ${successCount === 1 ? "uitnodiging" : "uitnodigingen"} verzonden, ${failureCount} ${failureCount === 1 ? "mislukt" : "mislukt"}`
            );
          }
        }
      },
      onError: ({ error }) => {
        toast.error(
          error.serverError || "Er is iets misgegaan bij het uitnodigen"
        );
      },
    }
  );

  const prepareUpdatePayload = () => ({
    onboardingId,
    name: formData.name,
    signupType: formData.signupType,
    orgSize:
      formData.signupType === "organization" ? formData.orgSize : undefined,
    researchQuestion:
      formData.signupType === "individual"
        ? formData.researchQuestion || undefined
        : undefined,
    organizationName:
      formData.signupType === "organization"
        ? formData.organizationName || undefined
        : undefined,
    referralSource: formData.referralSource || undefined,
    referralSourceOther:
      formData.referralSource === "other"
        ? formData.referralSourceOther || undefined
        : undefined,
  });

  const handleStepAction = (step: Step) => {
    if (step === 1 || step === 2) {
      updateData(prepareUpdatePayload());
    } else if (step === 8) {
      updateData({
        ...prepareUpdatePayload(),
        organizationName: formData.organizationName,
      });
    } else if (step === 3) {
      if (formData.signupType === "individual") {
        updateData(prepareUpdatePayload());
      }
    } else if (step === 4) {
      onStepChange(6);
    } else if (step === 5) {
      updateData(prepareUpdatePayload());
    } else if (step === 6) {
      updateData(prepareUpdatePayload());
    } else if (step === 7) {
      completeOnboarding({
        onboardingId,
        name: formData.name,
        signupType: formData.signupType,
        researchQuestion:
          formData.signupType === "individual"
            ? formData.researchQuestion || undefined
            : undefined,
        orgSize:
          formData.signupType === "organization" ? formData.orgSize : undefined,
        referralSource: formData.referralSource || undefined,
        referralSourceOther:
          formData.referralSource === "other"
            ? formData.referralSourceOther || undefined
            : undefined,
        newsletterOptIn: formData.newsletterOptIn,
      });
    }
  };

  const handleSkip = (step: Step) => {
    if (step === 3 && formData.signupType === "individual") {
      updateData({
        ...prepareUpdatePayload(),
        researchQuestion: undefined,
      });
    } else if (step === 4) {
      onStepChange(6);
    } else if (step === 9) {
      updateData(prepareUpdatePayload());
    }
  };

  const handleInviteColleagues = () => {
    if (formData.inviteEmails && formData.inviteEmails.trim().length > 0) {
      inviteColleagues({ emails: formData.inviteEmails });
    }
    updateData(prepareUpdatePayload());
  };

  return {
    updateData,
    completeOnboarding,
    inviteColleagues,
    handleStepAction,
    handleSkip,
    handleInviteColleagues,
    isLoading: isUpdating || isCompleting || isInviting,
    isCompleting,
  };
}

