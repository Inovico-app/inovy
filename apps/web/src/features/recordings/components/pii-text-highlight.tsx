"use client";

import {
  PII_TYPE_COLORS,
  PII_TYPE_LABELS,
  splitTextWithDetections,
} from "./pii-redaction-helpers";
import type { PIIDetection } from "@/server/services/pii-detection.service";

interface PIITextHighlightProps {
  transcriptionText: string;
  detections: PIIDetection[];
  isRedacted: (startIndex: number, endIndex: number) => boolean;
  onRedact: (detection: PIIDetection) => void;
}

export function PIITextHighlight({
  transcriptionText,
  detections,
  isRedacted,
  onRedact,
}: PIITextHighlightProps) {
  const parts = splitTextWithDetections(transcriptionText, detections);

  return (
    <div className="space-y-2">
      {parts.map((part, index) => {
        if (!part.isPII || !part.detection) {
          return <span key={index}>{part.text}</span>;
        }

        const redacted = isRedacted(
          part.detection.startIndex,
          part.detection.endIndex
        );
        const colorClass =
          PII_TYPE_COLORS[part.detection.type] ||
          "bg-gray-500/20 text-gray-700 dark:text-gray-400";

        return (
          <span
            key={index}
            className={`inline-block px-1 rounded ${
              redacted
                ? "bg-red-500/30 text-red-700 dark:text-red-400 line-through"
                : colorClass
            } cursor-pointer hover:opacity-80 transition-opacity`}
            onClick={() => !redacted && onRedact(part.detection!)}
            title={`${
              PII_TYPE_LABELS[part.detection.type] || part.detection.type
            } (${Math.round(part.detection.confidence * 100)}% vertrouwen)`}
          >
            {redacted ? "[REDACTED]" : part.text}
          </span>
        );
      })}
    </div>
  );
}

