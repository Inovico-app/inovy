import type { PIIDetection } from "@/server/services/pii-detection.service";

export const PII_TYPE_LABELS: Record<string, string> = {
  email: "Email",
  phone: "Telefoon",
  bsn: "BSN",
  credit_card: "Creditcard",
  medical_record: "Medisch Dossier",
  date_of_birth: "Geboortedatum",
  address: "Adres",
  ip_address: "IP Adres",
};

export const PII_TYPE_COLORS: Record<string, string> = {
  email: "bg-blue-500/20 text-blue-700 dark:text-blue-400",
  phone: "bg-green-500/20 text-green-700 dark:text-green-400",
  bsn: "bg-red-500/20 text-red-700 dark:text-red-400",
  credit_card: "bg-purple-500/20 text-purple-700 dark:text-purple-400",
  medical_record: "bg-orange-500/20 text-orange-700 dark:text-orange-400",
  date_of_birth: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400",
  address: "bg-indigo-500/20 text-indigo-700 dark:text-indigo-400",
  ip_address: "bg-gray-500/20 text-gray-700 dark:text-gray-400",
};

interface TextPart {
  text: string;
  isPII: boolean;
  detection?: PIIDetection;
}

export function splitTextWithDetections(
  transcriptionText: string,
  detections: PIIDetection[]
): TextPart[] {
  const parts: TextPart[] = [];
  let lastIndex = 0;

  // Sort detections by start index
  const sortedDetections = [...detections].sort(
    (a, b) => a.startIndex - b.startIndex
  );

  for (const detection of sortedDetections) {
    // Add text before detection
    if (detection.startIndex > lastIndex) {
      parts.push({
        text: transcriptionText.slice(lastIndex, detection.startIndex),
        isPII: false,
      });
    }

    // Add detection
    parts.push({
      text: detection.text,
      isPII: true,
      detection,
    });

    lastIndex = detection.endIndex;
  }

  // Add remaining text
  if (lastIndex < transcriptionText.length) {
    parts.push({
      text: transcriptionText.slice(lastIndex),
      isPII: false,
    });
  }

  return parts;
}

