"use client";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef } from "react";
import { useFormContext } from "react-hook-form";
import { useEmailChipInput } from "../../hooks/use-email-chip-input";
import type { OnboardingFormValues } from "../../schemas/onboarding-form.schema";

interface StepInviteColleaguesProps {
  isLoading: boolean;
}

function getInitials(email: string): string {
  const local = email.split("@")[0];
  const parts = local.split(/[._-]/).filter(Boolean);
  if (parts.length >= 2 && parts[0] && parts[1]) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  const cleaned = local.replace(/[._-]/g, "");
  return cleaned
    .slice(0, 2)
    .toUpperCase()
    .padEnd(2, cleaned[0]?.toUpperCase() ?? "?");
}

const AVATAR_COLORS = [
  "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
  "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
  "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/40 dark:text-fuchsia-300",
];

function getAvatarColor(index: number): string {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

export function StepInviteColleagues({ isLoading }: StepInviteColleaguesProps) {
  const { setValue } = useFormContext<OnboardingFormValues>();
  const inputRef = useRef<HTMLInputElement>(null);

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
    setValue("inviteEmails", emails.join(", "));
  }, [emails, setValue]);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-pretty">
          Nodig je team uit
        </h2>
        <p className="text-muted-foreground">
          Voeg e-mailadressen toe van collega&apos;s die je wilt uitnodigen. Zij
          ontvangen een uitnodiging per mail.
        </p>
      </div>

      <fieldset className="space-y-3" disabled={isLoading}>
        <label htmlFor="invite-email-input" className="text-sm font-medium">
          E-mailadressen
        </label>

        {/* Chip input area */}
        <div
          className={cn(
            "min-h-[3.5rem] w-full rounded-lg border bg-background px-3 py-2",
            "transition-[border-color,box-shadow] duration-150",
            "focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]",
            error && "border-destructive focus-within:ring-destructive/20"
          )}
          onClick={() => inputRef.current?.focus()}
          role="presentation"
        >
          <div className="flex flex-wrap items-center gap-1.5">
            <AnimatePresence mode="popLayout">
              {emails.map((email, index) => (
                <motion.div
                  key={email}
                  layout
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.15 }}
                >
                  <Badge
                    variant="secondary"
                    className="gap-1.5 py-1 pl-1 pr-2 text-sm font-normal"
                  >
                    <span
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold leading-none",
                        getAvatarColor(index)
                      )}
                      aria-hidden="true"
                    >
                      {getInitials(email)}
                    </span>
                    <span className="max-w-[180px] truncate">{email}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeEmail(email);
                      }}
                      className="ml-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/15 hover:text-destructive focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      aria-label={`${email} verwijderen`}
                    >
                      <svg
                        className="h-3 w-3"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </Badge>
                </motion.div>
              ))}
            </AnimatePresence>

            <Input
              ref={inputRef}
              id="invite-email-input"
              type="email"
              value={inputValue}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder={
                emails.length === 0
                  ? "collega@voorbeeld.nl"
                  : "Nog iemand toevoegen\u2026"
              }
              disabled={isLoading}
              autoComplete="off"
              spellCheck={false}
              className="h-7 min-w-[180px] flex-1 border-0 bg-transparent px-0 py-0 shadow-none ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/60"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "invite-hint invite-error" : "invite-hint"}
            />
          </div>
        </div>

        {/* Error message */}
        <AnimatePresence>
          {error && (
            <motion.p
              id="invite-error"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="text-sm text-destructive"
              role="alert"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Hint text */}
        <p id="invite-hint" className="text-sm text-muted-foreground">
          {emails.length === 0
            ? "Druk op Enter om toe te voegen. Je kunt ook meerdere adressen plakken."
            : `${emails.length} ${emails.length === 1 ? "collega" : "collega's"} ${emails.length === 1 ? "wordt" : "worden"} uitgenodigd`}
        </p>
      </fieldset>

      {/* Friendly skip nudge */}
      <AnimatePresence>
        {emails.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-lg border border-dashed border-border/60 bg-muted/30 p-4"
          >
            <p className="text-sm text-muted-foreground text-center">
              Je kunt deze stap ook overslaan en later collega&apos;s uitnodigen
              via de instellingen.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

