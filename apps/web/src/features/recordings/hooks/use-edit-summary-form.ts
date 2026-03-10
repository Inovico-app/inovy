import { useCallback, useReducer } from "react";

interface EditSummaryFormState {
  overview: string;
  topics: string;
  decisions: string;
  changeDescription: string;
}

type EditSummaryFormAction =
  | { type: "SET_FIELD"; field: keyof EditSummaryFormState; value: string }
  | {
      type: "RESET";
      payload: { overview: string; topics: string; decisions: string };
    };

function editSummaryFormReducer(
  state: EditSummaryFormState,
  action: EditSummaryFormAction
): EditSummaryFormState {
  switch (action.type) {
    case "SET_FIELD":
      return { ...state, [action.field]: action.value };
    case "RESET":
      return {
        overview: action.payload.overview,
        topics: action.payload.topics,
        decisions: action.payload.decisions,
        changeDescription: "",
      };
  }
}

interface SummaryInitialValues {
  overview?: string;
  topics?: string[];
  decisions?: string[];
}

export function useEditSummaryForm(summary: SummaryInitialValues) {
  const [formState, dispatch] = useReducer(editSummaryFormReducer, {
    overview: summary.overview ?? "",
    topics: summary.topics?.join("\n") ?? "",
    decisions: summary.decisions?.join("\n") ?? "",
    changeDescription: "",
  });

  const setField = useCallback(
    (field: keyof EditSummaryFormState, value: string) => {
      dispatch({ type: "SET_FIELD", field, value });
    },
    []
  );

  const resetForm = useCallback(
    (newSummary: SummaryInitialValues) => {
      dispatch({
        type: "RESET",
        payload: {
          overview: newSummary.overview ?? "",
          topics: newSummary.topics?.join("\n") ?? "",
          decisions: newSummary.decisions?.join("\n") ?? "",
        },
      });
    },
    []
  );

  return { formState, setField, resetForm };
}
