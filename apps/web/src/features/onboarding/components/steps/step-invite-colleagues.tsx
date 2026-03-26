"use client";

import { EmailChipInput } from "@/components/email-chip-input";
import { useEmailChipInput } from "@/hooks/use-email-chip-input";
import { AnimatePresence, LazyMotion, domAnimation, m } from "motion/react";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { useFormContext } from "react-hook-form";
import type { OnboardingFormValues } from "../../schemas/onboarding-form.schema";

interface StepInviteColleaguesProps {
  isLoading: boolean;
}

export function StepInviteColleagues({ isLoading }: StepInviteColleaguesProps) {
  const t = useTranslations("onboarding");
  const { setValue } = useFormContext<OnboardingFormValues>();

  const {
    emails,
    inputValue,
    error,
    handleInputChange,
    handleKeyDown,
    handlePaste,
    removeEmail,
  } = useEmailChipInput();

  useEffect(() => {
    if (emails.length > 0) {
      setValue("inviteEmails", emails.join(", "));
    } else {
      setValue("inviteEmails", "");
    }
  }, [emails, setValue]);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-pretty">
          {t("stepInviteTitle")}
        </h2>
        <p className="text-muted-foreground">{t("stepInviteSubtitle")}</p>
      </div>

      <fieldset className="space-y-3" disabled={isLoading}>
        <label htmlFor="invite-email-input" className="text-sm font-medium">
          {t("stepInviteLabel")}
        </label>

        <EmailChipInput
          emails={emails}
          inputValue={inputValue}
          error={error}
          disabled={isLoading}
          placeholder={t("stepInvitePlaceholder")}
          placeholderMore={t("stepInvitePlaceholderMore")}
          removeLabel={(email) => t("stepInviteRemoveLabel", { email })}
          hintEmpty={t("stepInviteHintEmpty")}
          hintCount={(count) => t("stepInviteHintCount", { count })}
          onInputChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onRemove={removeEmail}
        />
      </fieldset>

      {/* Friendly skip nudge */}
      <LazyMotion features={domAnimation}>
        <AnimatePresence>
          {emails.length === 0 && (
            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-lg border border-dashed border-border/60 bg-muted/30 p-4"
            >
              <p className="text-sm text-muted-foreground text-center">
                {t("stepInviteSkipHint")}
              </p>
            </m.div>
          )}
        </AnimatePresence>
      </LazyMotion>
    </div>
  );
}
