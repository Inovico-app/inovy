import { useReducer, useCallback } from "react";

interface TeamAssignmentState {
  isAssignDialogOpen: boolean;
  selectedUserId: string;
  selectedTeamId: string;
  selectedRole: string;
  isSubmitting: boolean;
  searchQuery: string;
  showRemoveDialog: {
    userId: string;
    userName: string;
    teamId: string;
    teamName: string;
  } | null;
}

type TeamAssignmentAction =
  | { type: "OPEN_ASSIGN_DIALOG" }
  | { type: "CLOSE_ASSIGN_DIALOG" }
  | { type: "SET_SELECTED_USER"; payload: string }
  | { type: "SET_SELECTED_TEAM"; payload: string }
  | { type: "SET_SELECTED_ROLE"; payload: string }
  | { type: "SET_SUBMITTING"; payload: boolean }
  | { type: "SET_SEARCH_QUERY"; payload: string }
  | {
      type: "SHOW_REMOVE_DIALOG";
      payload: TeamAssignmentState["showRemoveDialog"];
    }
  | { type: "HIDE_REMOVE_DIALOG" }
  | { type: "RESET_ASSIGN_FORM" };

const initialState: TeamAssignmentState = {
  isAssignDialogOpen: false,
  selectedUserId: "",
  selectedTeamId: "",
  selectedRole: "member",
  isSubmitting: false,
  searchQuery: "",
  showRemoveDialog: null,
};

function teamAssignmentReducer(
  state: TeamAssignmentState,
  action: TeamAssignmentAction
): TeamAssignmentState {
  switch (action.type) {
    case "OPEN_ASSIGN_DIALOG":
      return { ...state, isAssignDialogOpen: true };
    case "CLOSE_ASSIGN_DIALOG":
      return {
        ...state,
        isAssignDialogOpen: false,
        selectedUserId: "",
        selectedTeamId: "",
        selectedRole: "member",
      };
    case "SET_SELECTED_USER":
      return { ...state, selectedUserId: action.payload };
    case "SET_SELECTED_TEAM":
      return { ...state, selectedTeamId: action.payload };
    case "SET_SELECTED_ROLE":
      return { ...state, selectedRole: action.payload };
    case "SET_SUBMITTING":
      return { ...state, isSubmitting: action.payload };
    case "SET_SEARCH_QUERY":
      return { ...state, searchQuery: action.payload };
    case "SHOW_REMOVE_DIALOG":
      return { ...state, showRemoveDialog: action.payload };
    case "HIDE_REMOVE_DIALOG":
      return { ...state, showRemoveDialog: null };
    case "RESET_ASSIGN_FORM":
      return {
        ...state,
        selectedUserId: "",
        selectedTeamId: "",
        selectedRole: "member",
      };
    default:
      return state;
  }
}

export function useTeamAssignmentState() {
  const [state, dispatch] = useReducer(teamAssignmentReducer, initialState);

  const openAssignDialog = useCallback(
    () => dispatch({ type: "OPEN_ASSIGN_DIALOG" }),
    []
  );

  const closeAssignDialog = useCallback(
    () => dispatch({ type: "CLOSE_ASSIGN_DIALOG" }),
    []
  );

  const setSelectedUser = useCallback(
    (userId: string) => dispatch({ type: "SET_SELECTED_USER", payload: userId }),
    []
  );

  const setSelectedTeam = useCallback(
    (teamId: string) => dispatch({ type: "SET_SELECTED_TEAM", payload: teamId }),
    []
  );

  const setSelectedRole = useCallback(
    (role: string) => dispatch({ type: "SET_SELECTED_ROLE", payload: role }),
    []
  );

  const setSubmitting = useCallback(
    (value: boolean) => dispatch({ type: "SET_SUBMITTING", payload: value }),
    []
  );

  const setSearchQuery = useCallback(
    (query: string) => dispatch({ type: "SET_SEARCH_QUERY", payload: query }),
    []
  );

  const showRemoveDialog = useCallback(
    (data: TeamAssignmentState["showRemoveDialog"]) =>
      dispatch({ type: "SHOW_REMOVE_DIALOG", payload: data }),
    []
  );

  const hideRemoveDialog = useCallback(
    () => dispatch({ type: "HIDE_REMOVE_DIALOG" }),
    []
  );

  const resetAssignForm = useCallback(
    () => dispatch({ type: "RESET_ASSIGN_FORM" }),
    []
  );

  const setAssignDialogOpen = useCallback(
    (open: boolean) => {
      if (open) {
        dispatch({ type: "OPEN_ASSIGN_DIALOG" });
      } else {
        dispatch({ type: "CLOSE_ASSIGN_DIALOG" });
      }
    },
    []
  );

  return {
    state,
    dispatch,
    openAssignDialog,
    closeAssignDialog,
    setSelectedUser,
    setSelectedTeam,
    setSelectedRole,
    setSubmitting,
    setSearchQuery,
    showRemoveDialog,
    hideRemoveDialog,
    resetAssignForm,
    setAssignDialogOpen,
  };
}
