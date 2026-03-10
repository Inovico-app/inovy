import type { RecordingDeviceErrorInfo } from "@/features/recordings/lib/recording-device-errors";
import { getMicrophoneDevicePreferenceClient } from "@/features/recordings/lib/microphone-device-preferences";
import { getMicrophoneGainPreferenceClient } from "@/features/recordings/lib/microphone-gain-preferences";

import { MicrophoneState } from "./MicrophoneProvider";

// ============================================================================
// State
// ============================================================================

export interface MicrophoneReducerState {
  microphoneState: MicrophoneState;
  setupError: RecordingDeviceErrorInfo | null;
  microphone: MediaRecorder | null;
  stream: MediaStream | null;
  gain: number;
  deviceId: string | null;
}

export function createInitialState(): MicrophoneReducerState {
  return {
    microphoneState: MicrophoneState.NotSetup,
    setupError: null,
    microphone: null,
    stream: null,
    gain: getMicrophoneGainPreferenceClient(),
    deviceId: getMicrophoneDevicePreferenceClient(),
  };
}

// ============================================================================
// Actions
// ============================================================================

export type MicrophoneReducerAction =
  | { type: "SETUP_START" }
  | {
      type: "SETUP_SUCCESS";
      payload: { microphone: MediaRecorder; stream: MediaStream };
    }
  | { type: "SETUP_ERROR"; payload: RecordingDeviceErrorInfo }
  | { type: "SET_STATE"; payload: MicrophoneState }
  | { type: "SET_GAIN"; payload: number }
  | { type: "SET_DEVICE_ID"; payload: string | null }
  | { type: "CLEANUP" };

// ============================================================================
// Reducer
// ============================================================================

export function microphoneReducer(
  state: MicrophoneReducerState,
  action: MicrophoneReducerAction
): MicrophoneReducerState {
  switch (action.type) {
    case "SETUP_START":
      return {
        ...state,
        microphoneState: MicrophoneState.SettingUp,
        setupError: null,
      };

    case "SETUP_SUCCESS":
      return {
        ...state,
        microphoneState: MicrophoneState.Ready,
        microphone: action.payload.microphone,
        stream: action.payload.stream,
      };

    case "SETUP_ERROR":
      return {
        ...state,
        microphoneState: MicrophoneState.Error,
        setupError: action.payload,
      };

    case "SET_STATE":
      return {
        ...state,
        microphoneState: action.payload,
      };

    case "SET_GAIN":
      return {
        ...state,
        gain: action.payload,
      };

    case "SET_DEVICE_ID":
      return {
        ...state,
        deviceId: action.payload,
      };

    case "CLEANUP":
      return {
        ...createInitialState(),
        // Preserve user preferences across cleanup
        gain: state.gain,
        deviceId: state.deviceId,
      };

    default:
      return state;
  }
}
