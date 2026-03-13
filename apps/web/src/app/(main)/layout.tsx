import { PageLayout } from "@/components/page-layout";
import { SessionTimeoutProvider } from "@/features/auth/components/session-timeout-provider";
import { Suspense } from "react";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense>
      <SessionTimeoutProvider>
        <PageLayout>{children}</PageLayout>
      </SessionTimeoutProvider>
    </Suspense>
  );
}
