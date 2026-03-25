"use client";

import { signOut } from "@/lib/auth-client";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function useInvitationSignOut(invitationId: string) {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut({
        fetchOptions: {
          onSuccess: () => {
            router.push(`/accept-invitation/${invitationId}` as Route);
            router.refresh();
          },
        },
      });
    } finally {
      setIsSigningOut(false);
    }
  };

  return { handleSignOut, isSigningOut };
}
