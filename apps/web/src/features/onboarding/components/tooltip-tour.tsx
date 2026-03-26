"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTooltipTour } from "../hooks/use-tooltip-tour";

interface TooltipPosition {
  top: number;
  left: number;
  width: number;
  height: number;
}

const STEP_TRANSLATION_KEYS = [
  "tourStepDashboard",
  "tourStepRecordings",
  "tourStepMeetings",
  "tourStepNewRecording",
] as const;

export function TooltipTour() {
  const t = useTranslations("onboarding");
  const {
    isActive,
    currentStep,
    currentStepIndex,
    totalSteps,
    isFirstStep,
    isLastStep,
    handleNext,
    handlePrevious,
    handleDismiss,
  } = useTooltipTour();

  const [targetPosition, setTargetPosition] = useState<TooltipPosition | null>(
    null,
  );
  const [isMounted, setIsMounted] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isActive || !currentStep) {
      setTargetPosition(null);
      return;
    }

    const updatePosition = () => {
      const target = document.querySelector(currentStep.targetSelector);
      if (!target) {
        setTargetPosition(null);
        return;
      }

      const rect = target.getBoundingClientRect();
      setTargetPosition({
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
        height: rect.height,
      });
    };

    updatePosition();

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition);
    };
  }, [isActive, currentStep]);

  if (!isMounted || !isActive || !currentStep || !targetPosition) {
    return null;
  }

  const translationKey = STEP_TRANSLATION_KEYS[currentStepIndex];
  const tooltipContent = translationKey ? t(translationKey) : "";

  // Calculate tooltip position: prefer below the target, offset slightly
  const tooltipTop = targetPosition.top + targetPosition.height + 12;
  const tooltipLeft = targetPosition.left;

  return createPortal(
    <>
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 z-[99] bg-black/40 transition-opacity"
        onClick={handleDismiss}
        role="presentation"
      />

      {/* Highlight cutout around target */}
      <div
        className="fixed z-[100] rounded-lg ring-2 ring-primary ring-offset-2 ring-offset-background pointer-events-none"
        style={{
          top: targetPosition.top - 4,
          left: targetPosition.left - 4,
          width: targetPosition.width + 8,
          height: targetPosition.height + 8,
        }}
      />

      {/* Tooltip card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="fixed z-[101] w-80"
          style={{
            top: tooltipTop,
            left: Math.max(16, Math.min(tooltipLeft, window.innerWidth - 336)),
          }}
        >
          <Card ref={cardRef} className="shadow-lg">
            <CardContent className="space-y-3 pt-4">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold">{t("tourTitle")}</h4>
                    <Badge variant="secondary" className="text-xs">
                      {t("tourStepOf", {
                        current: currentStepIndex + 1,
                        total: totalSteps,
                      })}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {tooltipContent}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 shrink-0 p-0"
                  onClick={handleDismiss}
                  aria-label={t("tourDismiss")}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>

              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDismiss}
                  className="text-xs text-muted-foreground"
                >
                  {t("tourDismiss")}
                </Button>

                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrevious}
                    disabled={isFirstStep}
                    className={cn("text-xs", isFirstStep && "invisible")}
                  >
                    {t("tourPrevious")}
                  </Button>
                  <Button size="sm" onClick={handleNext} className="text-xs">
                    {isLastStep ? t("tourFinish") : t("tourNext")}
                  </Button>
                </div>
              </div>

              {/* Step dots */}
              <div
                className="flex items-center justify-center gap-1.5"
                role="tablist"
                aria-label={t("tourTitle")}
              >
                {Array.from({ length: totalSteps }).map((_, index) => (
                  <div
                    key={`tour-dot-${index}`}
                    role="tab"
                    aria-selected={index === currentStepIndex}
                    className={cn(
                      "h-1.5 rounded-full transition-all",
                      index === currentStepIndex
                        ? "w-4 bg-primary"
                        : "w-1.5 bg-muted-foreground/30",
                    )}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>
    </>,
    document.body,
  );
}
