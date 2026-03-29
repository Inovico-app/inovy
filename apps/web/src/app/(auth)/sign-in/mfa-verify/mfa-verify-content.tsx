"use client";

import { AuthShell } from "@/components/auth/auth-shell";
import { MfaVerify } from "@/features/auth/components/mfa-verify";
import { Suspense } from "react";

export default function MfaVerifyPage() {
  return (
    <Suspense>
      <AuthShell>
        <MfaVerify />
      </AuthShell>
    </Suspense>
  );
}
