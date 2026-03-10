import { useReducer, useCallback } from "react";

interface UploadState {
  file: File | null;
  isDragging: boolean;
  isUploading: boolean;
  uploadProgress: number;
  error: string | null;
}

type UploadAction =
  | { type: "SET_FILE"; payload: File }
  | { type: "REMOVE_FILE" }
  | { type: "SET_DRAGGING"; payload: boolean }
  | { type: "START_UPLOAD" }
  | { type: "UPDATE_PROGRESS"; payload: number }
  | { type: "UPLOAD_ERROR"; payload: string }
  | { type: "CANCEL_UPLOAD" }
  | { type: "RESET" };

const initialState: UploadState = {
  file: null,
  isDragging: false,
  isUploading: false,
  uploadProgress: 0,
  error: null,
};

function uploadReducer(state: UploadState, action: UploadAction): UploadState {
  switch (action.type) {
    case "SET_FILE":
      return { ...state, file: action.payload, error: null };
    case "REMOVE_FILE":
      return { ...state, file: null, error: null };
    case "SET_DRAGGING":
      return { ...state, isDragging: action.payload };
    case "START_UPLOAD":
      return { ...state, isUploading: true, error: null, uploadProgress: 0 };
    case "UPDATE_PROGRESS":
      return { ...state, uploadProgress: action.payload };
    case "UPLOAD_ERROR":
      return { ...state, error: action.payload, isUploading: false };
    case "CANCEL_UPLOAD":
      return { ...state, isUploading: false, uploadProgress: 0, error: null };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

export function useUploadState() {
  const [state, dispatch] = useReducer(uploadReducer, initialState);

  const setFile = useCallback(
    (file: File) => dispatch({ type: "SET_FILE", payload: file }),
    []
  );

  const removeFile = useCallback(
    () => dispatch({ type: "REMOVE_FILE" }),
    []
  );

  const setDragging = useCallback(
    (isDragging: boolean) => dispatch({ type: "SET_DRAGGING", payload: isDragging }),
    []
  );

  const startUpload = useCallback(
    () => dispatch({ type: "START_UPLOAD" }),
    []
  );

  const updateProgress = useCallback(
    (progress: number) => dispatch({ type: "UPDATE_PROGRESS", payload: progress }),
    []
  );

  const setUploadError = useCallback(
    (error: string) => dispatch({ type: "UPLOAD_ERROR", payload: error }),
    []
  );

  const cancelUpload = useCallback(
    () => dispatch({ type: "CANCEL_UPLOAD" }),
    []
  );

  const reset = useCallback(
    () => dispatch({ type: "RESET" }),
    []
  );

  return {
    state,
    dispatch,
    setFile,
    removeFile,
    setDragging,
    startUpload,
    updateProgress,
    setUploadError,
    cancelUpload,
    reset,
  };
}
