"use client";

import { toast } from "sonner";

export function usePasskeySignUp() {
  const signUpPasskey = async () => {
    // Passkeys in Better Auth require an authenticated user to register
    // Inform users they need to create an account first, then add a passkey
    toast.info(
      "To use passkeys, please sign up with email or social login first, then add a passkey in your account settings."
    );
  };

  return {
    signUpPasskey,
    isLoading: false, // No async operation for sign-up passkey
  };
}

