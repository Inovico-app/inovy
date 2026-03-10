import type { RecordingDeviceErrorInfo } from "@/features/recordings/lib/recording-device-errors";

import { SystemAudioState } from "./SystemAudioProvider";

// ============================================================================
// State
// ============================================================================

export interface SystemAudioReducerState {
  systemAudioState: SystemAudioState;
  setupError: RecordingDeviceErrorInfo | null;
  systemAudio: MediaRecorder | null;
  systemAudioStream: MediaStream | null;
  videoStream: MediaStream | null;
}

export function createInitialState(): SystemAudioReducerState {
  return {
    systemAudioState: SystemAudioState.NotSetup,
    setupError: null,
    systemAudio: null,
    systemAudioStream: null,
    videoStream: null,
  };
}

// ============================================================================
// Actions
// ============================================================================

export type SystemAudioReducerAction =
  | { type: "SETUP_START" }
  | {
      type: "SETUP_SUCCESS";
      payload: {
        systemAudio: MediaRecorder;
        systemAudioStream: MediaStream;
        videoStream: MediaStream | null;
      };
    }
  | { type: "SETUP_ERROR"; payload: RecordingDeviceErrorInfo }
  | { type: "SET_STATE"; payload: SystemAudioState }
  | { type: "CLEANUP" };

// ============================================================================
// Reducer
// ============================================================================

export function systemAudioReducer(
  state: SystemAudioReducerState,
  action: SystemAudioReducerAction
): SystemAudioReducerState {
  switch (action.type) {
    case "SETUP_START":
      return {
        ...state,
        systemAudioState: SystemAudioState.SettingUp,
        setupError: null,
      };

    case "SETUP_SUCCESS":
      return {
        ...state,
        systemAudioState: SystemAudioState.Ready,
        systemAudio: action.payload.systemAudio,
        systemAudioStream: action.payload.systemAudioStream,
        videoStream: action.payload.videoStream,
      };

    case "SETUP_ERROR":
      return {
        ...state,
        systemAudioState: SystemAudioState.Error,
        setupError: action.payload,
      };

    case "SET_STATE":
      return {
        ...state,
        systemAudioState: action.payload,
      };

    case "CLEANUP":
      return createInitialState();

    default:
      return state;
  }
}
