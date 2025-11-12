"use client";

/**
 * Generic hook for toggling items in an array
 */
export function useArrayToggle<T>(
  selectedItems: T[],
  onChange: (items: T[]) => void
) {
  // React Compiler automatically memoizes this function
  const toggle = (item: T) => {
    if (selectedItems.includes(item)) {
      onChange(selectedItems.filter((i) => i !== item));
    } else {
      onChange([...selectedItems, item]);
    }
  };

  return toggle;
}

