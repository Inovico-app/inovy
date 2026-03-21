import { useReducer, useCallback } from "react";

interface AuditLogFiltersState {
  eventTypes: string[];
  resourceTypes: string[];
  actions: string[];
  userId: string | undefined;
  resourceId: string | undefined;
  startDate: string | undefined;
  endDate: string | undefined;
  category: string;
}

type AuditLogFiltersAction =
  | { type: "SET_EVENT_TYPES"; payload: string[] }
  | { type: "SET_RESOURCE_TYPES"; payload: string[] }
  | { type: "SET_ACTIONS"; payload: string[] }
  | { type: "SET_USER_ID"; payload: string | undefined }
  | { type: "SET_RESOURCE_ID"; payload: string | undefined }
  | { type: "SET_START_DATE"; payload: string | undefined }
  | { type: "SET_END_DATE"; payload: string | undefined }
  | { type: "SET_CATEGORY"; payload: string }
  | { type: "CLEAR_FILTERS" };

const initialState: AuditLogFiltersState = {
  eventTypes: [],
  resourceTypes: [],
  actions: [],
  userId: undefined,
  resourceId: undefined,
  startDate: undefined,
  endDate: undefined,
  category: "mutation",
};

function auditLogFiltersReducer(
  state: AuditLogFiltersState,
  action: AuditLogFiltersAction,
): AuditLogFiltersState {
  switch (action.type) {
    case "SET_EVENT_TYPES":
      return { ...state, eventTypes: action.payload };
    case "SET_RESOURCE_TYPES":
      return { ...state, resourceTypes: action.payload };
    case "SET_ACTIONS":
      return { ...state, actions: action.payload };
    case "SET_USER_ID":
      return { ...state, userId: action.payload };
    case "SET_RESOURCE_ID":
      return { ...state, resourceId: action.payload };
    case "SET_START_DATE":
      return { ...state, startDate: action.payload };
    case "SET_END_DATE":
      return { ...state, endDate: action.payload };
    case "SET_CATEGORY":
      return { ...state, category: action.payload };
    case "CLEAR_FILTERS":
      return initialState;
    default:
      return state;
  }
}

interface UseAuditLogFiltersOptions {
  initialFilters?: {
    eventType?: string;
    resourceType?: string;
    action?: string;
    userId?: string;
    resourceId?: string;
    startDate?: string;
    endDate?: string;
    category?: string;
  };
}

export function useAuditLogFilters({
  initialFilters,
}: UseAuditLogFiltersOptions = {}) {
  const [filters, dispatch] = useReducer(auditLogFiltersReducer, {
    eventTypes: initialFilters?.eventType
      ? initialFilters.eventType.split(",").filter(Boolean)
      : [],
    resourceTypes: initialFilters?.resourceType
      ? initialFilters.resourceType.split(",").filter(Boolean)
      : [],
    actions: initialFilters?.action
      ? initialFilters.action.split(",").filter(Boolean)
      : [],
    userId: initialFilters?.userId,
    resourceId: initialFilters?.resourceId,
    startDate: initialFilters?.startDate,
    endDate: initialFilters?.endDate,
    category: initialFilters?.category ?? "mutation",
  });

  const setEventTypes = useCallback(
    (types: string[]) => dispatch({ type: "SET_EVENT_TYPES", payload: types }),
    [],
  );

  const setResourceTypes = useCallback(
    (types: string[]) =>
      dispatch({ type: "SET_RESOURCE_TYPES", payload: types }),
    [],
  );

  const setActions = useCallback(
    (acts: string[]) => dispatch({ type: "SET_ACTIONS", payload: acts }),
    [],
  );

  const setUserId = useCallback(
    (id: string | undefined) => dispatch({ type: "SET_USER_ID", payload: id }),
    [],
  );

  const setResourceId = useCallback(
    (id: string | undefined) =>
      dispatch({ type: "SET_RESOURCE_ID", payload: id }),
    [],
  );

  const setStartDate = useCallback(
    (date: string | undefined) =>
      dispatch({ type: "SET_START_DATE", payload: date }),
    [],
  );

  const setEndDate = useCallback(
    (date: string | undefined) =>
      dispatch({ type: "SET_END_DATE", payload: date }),
    [],
  );

  const setCategory = useCallback(
    (cat: string) => dispatch({ type: "SET_CATEGORY", payload: cat }),
    [],
  );

  const clearFilters = useCallback(
    () => dispatch({ type: "CLEAR_FILTERS" }),
    [],
  );

  return {
    filters,
    dispatch,
    clearFilters,
    setEventTypes,
    setResourceTypes,
    setActions,
    setUserId,
    setResourceId,
    setStartDate,
    setEndDate,
    setCategory,
  };
}
