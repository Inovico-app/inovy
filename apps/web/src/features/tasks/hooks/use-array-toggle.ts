"use client";

import { useCallback } from "react";

/**
 * Generic hook for toggling items in an array
 */
export function useArrayToggle<T>(
  selectedItems: T[],
  onChange: (items: T[]) => void
) {
  const toggle = useCallback(
    (item: T) => {
      if (selectedItems.includes(item)) {
        onChange(selectedItems.filter((i) => i !== item));
      } else {
        onChange([...selectedItems, item]);
      }
    },
    [selectedItems, onChange]
  );

  return toggle;
}

