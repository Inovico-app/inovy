"use client";

import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils";
import { MicIcon } from "lucide-react";
import {
  type ComponentProps,
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { PromptInputButton } from "./prompt-input";
import type { SpeechRecognition } from "./prompt-input-speech-types";

const DEFAULT_REGION_MAP: Record<string, string> = {
  nl: "nl-NL",
  en: "en-US",
  de: "de-DE",
  fr: "fr-FR",
  es: "es-ES",
  it: "it-IT",
  pt: "pt-PT",
};

function toBcp47(language: string): string {
  if (language.includes("-")) return language;
  return DEFAULT_REGION_MAP[language.toLowerCase()] ?? `${language}-${language.toUpperCase()}`;
}

export type PromptInputSpeechButtonProps = ComponentProps<
  typeof PromptInputButton
> & {
  textareaRef?: RefObject<HTMLTextAreaElement | null>;
  onTranscriptionChange?: (text: string) => void;
  language?: string;
};

export const PromptInputSpeechButton = ({
  className,
  textareaRef,
  onTranscriptionChange,
  language = "nl",
  ...props
}: PromptInputSpeechButtonProps) => {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isInitializedRef = useRef(false);

  // Initialize speech recognition lazily on first interaction
  const getRecognition = useCallback((): SpeechRecognition | null => {
    if (recognitionRef.current) return recognitionRef.current;
    if (isInitializedRef.current) return null;

    isInitializedRef.current = true;

    if (
      typeof window === "undefined" ||
      !("SpeechRecognition" in window || "webkitSpeechRecognition" in window)
    ) {
      return null;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    const speechRecognition = new SpeechRecognition();

    speechRecognition.continuous = true;
    speechRecognition.interimResults = true;
    speechRecognition.lang = toBcp47(language);

    speechRecognition.onstart = () => {
      setIsListening(true);
    };

    speechRecognition.onend = () => {
      setIsListening(false);
    };

    speechRecognition.onresult = (event) => {
      let finalTranscript = "";

      const results = Array.from(event.results);

      for (const result of results) {
        if (result.isFinal) {
          finalTranscript += result[0]?.transcript ?? "";
        }
      }

      if (finalTranscript && textareaRef?.current) {
        const textarea = textareaRef.current;
        const currentValue = textarea.value;
        const newValue =
          currentValue + (currentValue ? " " : "") + finalTranscript;

        textarea.value = newValue;
        textarea.dispatchEvent(new Event("input", { bubbles: true }));
        onTranscriptionChange?.(newValue);
      }
    };

    speechRecognition.onerror = (event) => {
      logger.error("Speech recognition error", {
        component: "PromptInputSpeechButton",
        error: event.error,
      });
      setIsListening(false);
    };

    recognitionRef.current = speechRecognition;
    return speechRecognition;
  }, [textareaRef, onTranscriptionChange, language]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const toggleListening = useCallback(() => {
    const recognition = getRecognition();
    if (!recognition) {
      return;
    }

    if (isListening) {
      recognition.stop();
    } else {
      recognition.start();
    }
  }, [getRecognition, isListening]);

  return (
    <PromptInputButton
      className={cn(
        "relative transition-all duration-200",
        isListening && "animate-pulse bg-accent text-accent-foreground",
        className
      )}
      onClick={toggleListening}
      aria-label={isListening ? "Stop voice input" : "Start voice input"}
      aria-pressed={isListening}
      {...props}
    >
      <MicIcon className="size-4" aria-hidden="true" />
    </PromptInputButton>
  );
};
