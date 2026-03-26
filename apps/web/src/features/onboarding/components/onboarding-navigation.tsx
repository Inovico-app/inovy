"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Activity } from "react";
import type { Step } from "../hooks/use-onboarding-steps";

interface OnboardingNavigationProps {
  currentStep: Step;
  isLoading: boolean;
  isCompleting: boolean;
  canProceed: boolean;
  onBack: () => void;
  onNext: () => void;
  onSkip?: () => void;
  onInvite?: () => void;
  showSkip?: boolean;
  showInvite?: boolean;
}

export function OnboardingNavigation({
  currentStep,
  isLoading,
  isCompleting,
  canProceed,
  onBack,
  onNext,
  onSkip,
  onInvite,
  showSkip = false,
  showInvite = false,
}: OnboardingNavigationProps) {
  const t = useTranslations("onboarding");

  return (
    <div className="flex items-center justify-between pt-6">
      <Activity mode={currentStep > 1 ? "visible" : "hidden"}>
        <Button
          type="button"
          variant="ghost"
          onClick={onBack}
          disabled={isLoading}
          className="w-full sm:w-auto"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("backButton")}
        </Button>
      </Activity>

      <Activity mode={currentStep <= 1 ? "visible" : "hidden"}>
        <div />
      </Activity>

      <div className="flex items-center gap-2 ml-auto">
        <Activity mode={showSkip && onSkip ? "visible" : "hidden"}>
          <Button
            type="button"
            variant="outline"
            onClick={onSkip}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            {t("skipButton")}
          </Button>
        </Activity>

        <Activity mode={showInvite && onInvite ? "visible" : "hidden"}>
          <Button
            type="button"
            onClick={onInvite}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("sendingInvites")}
              </>
            ) : (
              <>
                {t("sendInvites")}
                <svg
                  className="ml-2 h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </>
            )}
          </Button>
        </Activity>

        <Activity
          mode={
            !showInvite && !onInvite && currentStep !== 7 ? "visible" : "hidden"
          }
        >
          <Button
            type="button"
            onClick={onNext}
            disabled={!canProceed || isLoading}
            className="w-full sm:w-auto"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("saving")}
              </>
            ) : (
              <>
                {t("nextButton")}
                <svg
                  className="ml-2 h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </>
            )}
          </Button>
        </Activity>

        <Activity mode={currentStep === 7 ? "visible" : "hidden"}>
          <Button
            type="submit"
            disabled={isLoading || !canProceed}
            className="w-full sm:w-auto"
          >
            {isCompleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("starting")}
              </>
            ) : (
              <>
                {t("startWithInovy")}
                <CheckCircle2 className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </Activity>
      </div>
    </div>
  );
}
