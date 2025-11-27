"use client";

/**
 * Better Auth Provider
 *
 * Better Auth doesn't require a provider component.
 * The auth client hooks work directly without a provider wrapper.
 * This component exists for compatibility and can be removed if not needed.
 */
export const BetterAuthProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  // Better Auth hooks work without a provider, so we just return children
  return <>{children}</>;
};

