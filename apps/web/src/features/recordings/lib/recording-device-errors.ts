/**
 * Maps MediaDevices/getUserMedia/getDisplayMedia DOMException errors to
 * user-friendly messages. Keeps users on the page with clear feedback
 * instead of showing an error screen.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia#exceptions
 */

export type RecordingDeviceErrorType =
  | "permission_denied"
  | "device_not_found"
  | "device_in_use"
  | "constraints_not_met"
  | "security"
  | "browser_not_supported"
  | "unknown";

export interface RecordingDeviceErrorInfo {
  type: RecordingDeviceErrorType;
  title: string;
  message: string;
  /** Whether this is a permission-related error (user can retry after granting access) */
  isRetryable: boolean;
}

/**
 * DOMException names from getUserMedia/getDisplayMedia across browsers.
 * Chrome may use PermissionDeniedError; Firefox uses NotAllowedError.
 */
const PERMISSION_ERROR_NAMES = new Set([
  "NotAllowedError",
  "PermissionDeniedError",
]);

const DEVICE_NOT_FOUND_NAMES = new Set([
  "NotFoundError",
  "DevicesNotFoundError",
]);

const DEVICE_IN_USE_NAMES = new Set([
  "NotReadableError",
  "TrackStartError",
]);

const CONSTRAINTS_NAMES = new Set([
  "OverconstrainedError",
  "ConstraintNotSatisfiedError",
]);

/**
 * Maps a MediaDevices error to a structured, user-friendly representation.
 */
export function getRecordingDeviceErrorInfo(error: unknown): RecordingDeviceErrorInfo {
  if (!(error instanceof DOMException)) {
    return {
      type: "unknown",
      title: "Recording error",
      message:
        error instanceof Error
          ? error.message
          : "Er is een fout opgetreden bij het openen van het opnameapparaat.",
      isRetryable: true,
    };
  }

  if (PERMISSION_ERROR_NAMES.has(error.name)) {
    return {
      type: "permission_denied",
      title: "Microfoontoegang nodig",
      message:
        "Sta microfoontoegang toe in je browser om te kunnen opnemen. Klik op het slot- of camera‑icoon in de adresbalk en kies 'Toestaan'.",
      isRetryable: true,
    };
  }

  if (DEVICE_NOT_FOUND_NAMES.has(error.name)) {
    return {
      type: "device_not_found",
      title: "Geen microfoon gevonden",
      message:
        "Er is geen microfoon beschikbaar of aangesloten. Controleer of je microfoon correct is aangesloten en probeer het opnieuw.",
      isRetryable: true,
    };
  }

  if (DEVICE_IN_USE_NAMES.has(error.name)) {
    return {
      type: "device_in_use",
      title: "Microfoon in gebruik",
      message:
        "Je microfoon wordt al door een andere applicatie gebruikt. Sluit andere programma's die de microfoon gebruiken en probeer het opnieuw.",
      isRetryable: true,
    };
  }

  if (CONSTRAINTS_NAMES.has(error.name)) {
    return {
      type: "constraints_not_met",
      title: "Microfoon niet compatibel",
      message:
        "Je microfoon voldoet niet aan de vereisten. Probeer een andere microfoon of controleer je browserinstellingen.",
      isRetryable: true,
    };
  }

  if (error.name === "SecurityError") {
    return {
      type: "security",
      title: "Beveiligingsbeperking",
      message:
        "Toegang tot de microfoon is geblokkeerd door beveiligingsinstellingen. Gebruik een beveiligd pad (HTTPS) en controleer je browserinstellingen.",
      isRetryable: false,
    };
  }

  if (error.name === "AbortError") {
    return {
      type: "unknown",
      title: "Toegang geannuleerd",
      message:
        "De toegang tot het opnameapparaat is afgebroken. Probeer het opnieuw.",
      isRetryable: true,
    };
  }

  return {
    type: "unknown",
    title: "Opnameapparaat niet beschikbaar",
    message:
      error.message ||
      "Er is een fout opgetreden bij het openen van het opnameapparaat. Controleer je microfoon en browserinstellingen.",
    isRetryable: true,
  };
}

/**
 * Returns true if the error is a permission-related error (user denied or not yet prompted).
 */
export function isPermissionError(error: unknown): boolean {
  if (!(error instanceof DOMException)) return false;
  return PERMISSION_ERROR_NAMES.has(error.name);
}

/**
 * User-friendly message for system audio (getDisplayMedia) errors.
 */
export function getSystemAudioErrorInfo(
  error: unknown
): RecordingDeviceErrorInfo {
  if (error instanceof Error && !(error instanceof DOMException)) {
    const msg = error.message.toLowerCase();
    if (msg.includes("share system audio") || msg.includes("audio track")) {
      return {
        type: "permission_denied",
        title: "Systeemgeluid selecteren",
        message:
          "Selecteer 'Dit scherm delen' of 'Systeemgeluid delen' in het venster dat verschijnt om systeemaudio op te nemen.",
        isRetryable: true,
      };
    }
    if (msg.includes("not supported")) {
      return {
        type: "browser_not_supported",
        title: "Browser niet ondersteund",
        message:
          "Systeemaudio-opname wordt niet ondersteund in deze browser. Gebruik Chrome, Edge of Opera.",
        isRetryable: false,
      };
    }
  }

  const base = getRecordingDeviceErrorInfo(error);
  if (base.type === "permission_denied") {
    return {
      ...base,
      title: "Toegang tot schermgeluid nodig",
      message:
        "Selecteer 'Dit scherm delen' of 'Systeemgeluid delen' in het venster dat verschijnt om systeemaudio op te nemen.",
      isRetryable: true,
    };
  }
  return base;
}
