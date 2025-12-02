import { PageLayout } from "@/components/page-layout";
import { Suspense } from "react";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense>
      <PageLayout>{children}</PageLayout>
    </Suspense>
  );
}

