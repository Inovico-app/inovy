import { useCallback, useState } from "react";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface UseEmailChipInputMessages {
  invalidEmail: (email: string) => string;
  duplicateEmail: (email: string) => string;
  maxEmails: (max: number) => string;
}

export interface UseEmailChipInputOptions {
  onChange?: (emails: string[]) => void;
  maxEmails?: number;
  messages?: UseEmailChipInputMessages;
}

const DEFAULT_MESSAGES: UseEmailChipInputMessages = {
  invalidEmail: (email) => `"${email}" is geen geldig e-mailadres`,
  duplicateEmail: (email) => `${email} is al toegevoegd`,
  maxEmails: (max) => `Je kunt maximaal ${max} collega's tegelijk uitnodigen`,
};

export function useEmailChipInput({
  onChange,
  maxEmails = 20,
  messages = DEFAULT_MESSAGES,
}: UseEmailChipInputOptions = {}) {
  const [emails, setEmails] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const addEmail = useCallback(
    (raw: string) => {
      const email = raw.trim().toLowerCase();
      if (!email) return false;

      if (!EMAIL_REGEX.test(email)) {
        setError(messages.invalidEmail(email));
        return false;
      }

      setEmails((prev) => {
        if (prev.includes(email)) {
          setError(messages.duplicateEmail(email));
          return prev;
        }

        if (prev.length >= maxEmails) {
          setError(messages.maxEmails(maxEmails));
          return prev;
        }

        setError(null);
        const next = [...prev, email];
        onChange?.(next);
        return next;
      });

      return true;
    },
    [maxEmails, onChange, messages]
  );

  const addEmails = useCallback(
    (parts: string[]) => {
      setEmails((prev) => {
        const next = [...prev];
        let lastError: string | null = null;
        let modified = false;

        for (const part of parts) {
          const email = part.trim().toLowerCase();
          if (!email) continue;

          if (!EMAIL_REGEX.test(email)) {
            lastError = messages.invalidEmail(email);
            continue;
          }

          if (next.includes(email)) {
            lastError = messages.duplicateEmail(email);
            continue;
          }

          if (next.length >= maxEmails) {
            lastError = messages.maxEmails(maxEmails);
            break;
          }

          next.push(email);
          modified = true;
        }

        if (modified) {
          setError(null);
          onChange?.(next);
        } else if (lastError) {
          setError(lastError);
        }

        return next;
      });
    },
    [maxEmails, onChange, messages]
  );

  const removeEmail = useCallback(
    (email: string) => {
      setError(null);
      setEmails((prev) => {
        const next = prev.filter((e) => e !== email);
        onChange?.(next);
        return next;
      });
    },
    [onChange]
  );

  const handleInputChange = useCallback(
    (value: string) => {
      if (error) setError(null);

      if (value.includes(",") || value.includes("\n")) {
        const parts = value.split(/[,\n]/);
        addEmails(parts);
        setInputValue("");
        return;
      }

      setInputValue(value);
    },
    [addEmails, error]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" || e.key === "Tab") {
        if (inputValue.trim()) {
          e.preventDefault();
          const added = addEmail(inputValue);
          if (added) setInputValue("");
        }
        return;
      }

      if (e.key === "Backspace" && !inputValue && emails.length > 0) {
        removeEmail(emails[emails.length - 1]);
      }
    },
    [inputValue, emails, addEmail, removeEmail]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLInputElement>) => {
      const pasted = e.clipboardData.getData("text");
      if (
        pasted.includes(",") ||
        pasted.includes("\n") ||
        pasted.includes(" ")
      ) {
        e.preventDefault();
        const parts = pasted.split(/[,\n\s]+/);
        addEmails(parts);
      }
    },
    [addEmails]
  );

  const clear = useCallback(() => {
    setEmails([]);
    setInputValue("");
    setError(null);
    onChange?.([]);
  }, [onChange]);

  const toCommaSeparated = useCallback(() => emails.join(", "), [emails]);

  return {
    emails,
    inputValue,
    error,
    addEmail,
    removeEmail,
    handleInputChange,
    handleKeyDown,
    handlePaste,
    clear,
    toCommaSeparated,
  };
}

