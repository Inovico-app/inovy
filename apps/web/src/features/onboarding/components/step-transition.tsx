"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef } from "react";

interface StepTransitionProps {
  children: React.ReactNode;
}

export function StepTransition({ children }: StepTransitionProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Focus the first interactive element when the step mounts/transitions in
    const timer = setTimeout(() => {
      const element = ref.current?.querySelector(
        'input, select, textarea, button[type="submit"]'
      );
      if (element instanceof HTMLElement) {
        element.focus();
      }
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

