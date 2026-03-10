import { useCallback, useReducer } from "react";

interface DeleteProjectState {
  isLoading: boolean;
  confirmationText: string;
  confirmCheckbox: boolean;
  error: string | null;
}

type DeleteProjectAction =
  | { type: "SET_CONFIRMATION_TEXT"; payload: string }
  | { type: "SET_CHECKBOX"; payload: boolean }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "RESET" };

const initialState: DeleteProjectState = {
  isLoading: false,
  confirmationText: "",
  confirmCheckbox: false,
  error: null,
};

function deleteProjectReducer(
  state: DeleteProjectState,
  action: DeleteProjectAction
): DeleteProjectState {
  switch (action.type) {
    case "SET_CONFIRMATION_TEXT":
      return { ...state, confirmationText: action.payload, error: null };
    case "SET_CHECKBOX":
      return { ...state, confirmCheckbox: action.payload, error: null };
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload };
    case "RESET":
      return initialState;
  }
}

export function useDeleteProjectState() {
  const [state, dispatch] = useReducer(deleteProjectReducer, initialState);

  const setConfirmationText = useCallback((value: string) => {
    dispatch({ type: "SET_CONFIRMATION_TEXT", payload: value });
  }, []);

  const setCheckbox = useCallback((value: boolean) => {
    dispatch({ type: "SET_CHECKBOX", payload: value });
  }, []);

  const setLoading = useCallback((value: boolean) => {
    dispatch({ type: "SET_LOADING", payload: value });
  }, []);

  const setError = useCallback((value: string | null) => {
    dispatch({ type: "SET_ERROR", payload: value });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: "RESET" });
  }, []);

  return {
    state,
    setConfirmationText,
    setCheckbox,
    setLoading,
    setError,
    reset,
  };
}
