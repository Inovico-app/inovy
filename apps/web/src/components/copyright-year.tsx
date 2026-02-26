"use client";

export function CopyrightYear() {
  const year = new Date().getFullYear();

  return <>{year}</>;
}

