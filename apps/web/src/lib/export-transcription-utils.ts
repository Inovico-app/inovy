interface Utterance {
  speaker: number;
  text: string;
  start: number;
  end: number;
  confidence: number;
}

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const millis = Math.floor((seconds % 1) * 1000);

  if (hours > 0) {
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")},${millis
      .toString()
      .padStart(3, "0")}`;
  }
  return `${minutes.toString().padStart(2, "0")}:${secs
    .toString()
    .padStart(2, "0")},${millis.toString().padStart(3, "0")}`;
}

function formatTimeSimple(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function exportAsText(
  utterances: Utterance[],
  speakerNames?: Record<number, string>
): string {
  return utterances
    .map((utterance) => {
      const speakerName =
        speakerNames?.[utterance.speaker] || `Spreker ${utterance.speaker + 1}`;
      return `${speakerName} [${formatTimeSimple(utterance.start)}]: ${utterance.text}`;
    })
    .join("\n\n");
}

export function exportAsSRT(
  utterances: Utterance[],
  speakerNames?: Record<number, string>
): string {
  return utterances
    .map((utterance, index) => {
      const speakerName =
        speakerNames?.[utterance.speaker] || `Spreker ${utterance.speaker + 1}`;
      return `${index + 1}
${formatTime(utterance.start)} --> ${formatTime(utterance.end)}
<v ${speakerName}>${utterance.text}`;
    })
    .join("\n\n");
}

export function exportAsJSON(
  utterances: Utterance[],
  speakerNames?: Record<number, string>
): string {
  const data = utterances.map((utterance) => ({
    speaker: utterance.speaker,
    speakerName:
      speakerNames?.[utterance.speaker] || `Spreker ${utterance.speaker + 1}`,
    text: utterance.text,
    start: utterance.start,
    end: utterance.end,
    confidence: Math.round(utterance.confidence * 100),
  }));
  return JSON.stringify(data, null, 2);
}

export function downloadFile(
  content: string,
  filename: string,
  mimeType: string = "text/plain"
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

