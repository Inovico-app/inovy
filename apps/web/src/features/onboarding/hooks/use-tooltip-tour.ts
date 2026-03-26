"use client";

import { useCallback, useEffect, useState } from "react";

const TOUR_STORAGE_KEY = "inovy-onboarding-tour-completed";

interface TourStep {
  id: string;
  targetSelector: string;
}

const TOUR_STEPS: TourStep[] = [
  { id: "dashboard", targetSelector: '[data-tour="dashboard"]' },
  { id: "recordings", targetSelector: '[data-tour="recordings"]' },
  { id: "meetings", targetSelector: '[data-tour="meetings"]' },
  { id: "new-recording", targetSelector: '[data-tour="new-recording"]' },
];

function completeTour() {
  localStorage.setItem(TOUR_STORAGE_KEY, "true");
}

export function useTooltipTour() {
  const [isActive, setIsActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    const tourCompleted = localStorage.getItem(TOUR_STORAGE_KEY);
    if (!tourCompleted) {
      // Small delay to let the page render before showing the tour
      const timer = setTimeout(() => {
        setIsActive(true);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const currentStep = TOUR_STEPS[currentStepIndex];
  const totalSteps = TOUR_STEPS.length;
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === totalSteps - 1;

  const handleFinish = useCallback(() => {
    completeTour();
    setIsActive(false);
    setCurrentStepIndex(0);
  }, []);

  const handleNext = useCallback(() => {
    if (isLastStep) {
      handleFinish();
      return;
    }
    setCurrentStepIndex((prev) => prev + 1);
  }, [isLastStep, handleFinish]);

  const handlePrevious = useCallback(() => {
    if (isFirstStep) {
      return;
    }
    setCurrentStepIndex((prev) => prev - 1);
  }, [isFirstStep]);

  const handleDismiss = useCallback(() => {
    completeTour();
    setIsActive(false);
    setCurrentStepIndex(0);
  }, []);

  return {
    isActive,
    currentStep,
    currentStepIndex,
    totalSteps,
    isFirstStep,
    isLastStep,
    handleNext,
    handlePrevious,
    handleFinish,
    handleDismiss,
  };
}
