import { useCallback, useReducer } from "react";

interface TranscriptionEditState {
  editedText: string;
  changeDescription: string;
  showSearchReplace: boolean;
  searchTerm: string;
  replaceTerm: string;
}

type TranscriptionEditAction =
  | { type: "SET_EDITED_TEXT"; payload: string }
  | { type: "SET_CHANGE_DESCRIPTION"; payload: string }
  | { type: "TOGGLE_SEARCH_REPLACE" }
  | { type: "SET_SEARCH_TERM"; payload: string }
  | { type: "SET_REPLACE_TERM"; payload: string }
  | { type: "EXECUTE_REPLACE" }
  | { type: "RESET"; payload: { transcriptionText: string } }
  | { type: "CLOSE_SEARCH_REPLACE" };

function transcriptionEditReducer(
  state: TranscriptionEditState,
  action: TranscriptionEditAction
): TranscriptionEditState {
  switch (action.type) {
    case "SET_EDITED_TEXT":
      return { ...state, editedText: action.payload };
    case "SET_CHANGE_DESCRIPTION":
      return { ...state, changeDescription: action.payload };
    case "TOGGLE_SEARCH_REPLACE":
      return { ...state, showSearchReplace: !state.showSearchReplace };
    case "SET_SEARCH_TERM":
      return { ...state, searchTerm: action.payload };
    case "SET_REPLACE_TERM":
      return { ...state, replaceTerm: action.payload };
    case "EXECUTE_REPLACE": {
      if (!state.searchTerm) return state;
      return {
        ...state,
        editedText: state.editedText.replaceAll(
          state.searchTerm,
          state.replaceTerm
        ),
        searchTerm: "",
        replaceTerm: "",
        showSearchReplace: false,
      };
    }
    case "RESET":
      return {
        editedText: action.payload.transcriptionText,
        changeDescription: "",
        showSearchReplace: false,
        searchTerm: "",
        replaceTerm: "",
      };
    case "CLOSE_SEARCH_REPLACE":
      return {
        ...state,
        searchTerm: "",
        replaceTerm: "",
        showSearchReplace: false,
      };
  }
}

export function useTranscriptionEditState(transcriptionText: string) {
  const [state, dispatch] = useReducer(transcriptionEditReducer, {
    editedText: transcriptionText,
    changeDescription: "",
    showSearchReplace: false,
    searchTerm: "",
    replaceTerm: "",
  });

  const setEditedText = useCallback((value: string) => {
    dispatch({ type: "SET_EDITED_TEXT", payload: value });
  }, []);

  const setChangeDescription = useCallback((value: string) => {
    dispatch({ type: "SET_CHANGE_DESCRIPTION", payload: value });
  }, []);

  const toggleSearchReplace = useCallback(() => {
    dispatch({ type: "TOGGLE_SEARCH_REPLACE" });
  }, []);

  const setSearchTerm = useCallback((value: string) => {
    dispatch({ type: "SET_SEARCH_TERM", payload: value });
  }, []);

  const setReplaceTerm = useCallback((value: string) => {
    dispatch({ type: "SET_REPLACE_TERM", payload: value });
  }, []);

  const executeReplace = useCallback(() => {
    dispatch({ type: "EXECUTE_REPLACE" });
  }, []);

  const reset = useCallback((newTranscriptionText: string) => {
    dispatch({
      type: "RESET",
      payload: { transcriptionText: newTranscriptionText },
    });
  }, []);

  const closeSearchReplace = useCallback(() => {
    dispatch({ type: "CLOSE_SEARCH_REPLACE" });
  }, []);

  return {
    state,
    setEditedText,
    setChangeDescription,
    toggleSearchReplace,
    setSearchTerm,
    setReplaceTerm,
    executeReplace,
    reset,
    closeSearchReplace,
  };
}
