"use client";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { getAvatarColor, getInitials } from "@/lib/email-chip-utils";
import { cn } from "@/lib/utils";
import { XIcon } from "lucide-react";
import { AnimatePresence, LazyMotion, domAnimation, m } from "motion/react";
import { useRef } from "react";

const defaultRemoveLabel = (email: string) => `Remove ${email}`;
const defaultHintCount = (count: number) =>
  `${count} ${count === 1 ? "person" : "people"} will be invited`;

interface EmailChipInputProps {
  emails: string[];
  inputValue: string;
  error: string | null;
  disabled?: boolean;
  placeholder?: string;
  placeholderMore?: string;
  removeLabel?: (email: string) => string;
  hintEmpty?: string;
  hintCount?: (count: number) => string;
  onInputChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onPaste: (e: React.ClipboardEvent<HTMLInputElement>) => void;
  onRemove: (email: string) => void;
}

export function EmailChipInput({
  emails,
  inputValue,
  error,
  disabled,
  placeholder = "user@example.com",
  placeholderMore = "Add another\u2026",
  removeLabel = defaultRemoveLabel,
  hintEmpty = "Press Enter to add. You can also paste multiple addresses.",
  hintCount = defaultHintCount,
  onInputChange,
  onKeyDown,
  onPaste,
  onRemove,
}: EmailChipInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleContainerClick = () => {
    inputRef.current?.focus();
  };

  const handleRemoveClick = (email: string) => (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    onRemove(email);
  };

  return (
    <div className="space-y-2">
      <div
        className={cn(
          "min-h-[3.5rem] w-full rounded-lg border bg-background px-3 py-2",
          "transition-[border-color,box-shadow] duration-150",
          "focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]",
          error && "border-destructive focus-within:ring-destructive/20"
        )}
        onClick={handleContainerClick}
        role="presentation"
      >
        <div className="flex flex-wrap items-center gap-1.5">
          <LazyMotion features={domAnimation}>
          <AnimatePresence mode="popLayout">
            {emails.map((email, index) => (
              <m.div
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
                    onClick={handleRemoveClick(email)}
                    disabled={disabled}
                    className="ml-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/15 hover:text-destructive focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                    aria-label={removeLabel(email)}
                  >
                    <XIcon className="h-3 w-3" />
                  </button>
                </Badge>
              </m.div>
            ))}
          </AnimatePresence>
          </LazyMotion>

          <Input
            ref={inputRef}
            id="invite-email-input"
            type="email"
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={onKeyDown}
            onPaste={onPaste}
            placeholder={emails.length === 0 ? placeholder : placeholderMore}
            disabled={disabled}
            autoComplete="off"
            spellCheck={false}
            className="h-7 min-w-[140px] flex-1 border-0 bg-transparent px-0 py-0 shadow-none ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/60"
            aria-invalid={Boolean(error)}
            aria-describedby={
              error ? "invite-hint invite-error" : "invite-hint"
            }
          />
        </div>
      </div>

      {/* Error message */}
      <LazyMotion features={domAnimation}>
      <AnimatePresence>
        {error && (
          <m.p
            id="invite-error"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="text-sm text-destructive"
            role="alert"
          >
            {error}
          </m.p>
        )}
      </AnimatePresence>
      </LazyMotion>

      {/* Hint text */}
      <p id="invite-hint" className="text-sm text-muted-foreground">
        {emails.length === 0 ? hintEmpty : hintCount(emails.length)}
      </p>
    </div>
  );
}
