"use client";

/**
 * Better Auth Provider
 *
 * Better Auth doesn't require a provider component like Kinde.
 * The auth client hooks work directly without a provider wrapper.
 * This component exists for compatibility during migration and can be removed
 * once all Kinde references are cleaned up.
 */
export const BetterAuthProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  // Better Auth hooks work without a provider, so we just return children
  return <>{children}</>;
};

// Keep KindeAuthProvider export for backward compatibility during migration
// TODO: Remove in Phase 7 (INO-238)
export const KindeAuthProvider = BetterAuthProvider;

