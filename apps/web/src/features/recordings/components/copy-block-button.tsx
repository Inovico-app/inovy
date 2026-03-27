"use client";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CheckIcon, CopyIcon } from "lucide-react";
import { type MouseEvent, useCallback } from "react";
import { useCopyToClipboard } from "../hooks/use-copy-to-clipboard";

interface CopyBlockButtonProps {
  text: string;
  label: string;
}

export function CopyBlockButton({ text, label }: CopyBlockButtonProps) {
  const { isCopied, copyToClipboard } = useCopyToClipboard();

  const handleClick = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation();
      void copyToClipboard(text);
    },
    [copyToClipboard, text],
  );

  const Icon = isCopied ? CheckIcon : CopyIcon;

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon-xs"
            className="opacity-50 hover:opacity-100 transition-opacity print:hidden"
            onClick={handleClick}
            aria-label={label}
          />
        }
      >
        <span aria-live="polite" className="sr-only">
          {isCopied ? label.replace("Copy", "Copied") : label}
        </span>
        <Icon className="size-3" />
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
}
