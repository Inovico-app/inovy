import { Skeleton } from "@/components/ui/skeleton";
import { resolveAuthContext } from "@/lib/auth-context";
import { buildDpaContext } from "@/features/admin/components/compliance/dpa/dpa-data";
import { DpaPreview } from "@/features/admin/components/compliance/dpa/dpa-preview";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Verwerkersovereenkomst (DPA)",
  description: "Genereer en download uw verwerkersovereenkomst",
};

async function DpaContent() {
  const authResult = await resolveAuthContext("DpaPage");
  if (authResult.isErr()) {
    redirect("/");
  }

  const { organization } = authResult.value;
  const orgName = organization.name ?? "Organisatie";
  const context = buildDpaContext(orgName, "privacy@inovico.nl");

  return <DpaPreview context={context} />;
}

export default function DpaPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto max-w-6xl py-6 px-4 md:py-12 md:px-6">
          <div className="mb-10 space-y-4">
            <Skeleton className="h-9 w-80" />
            <Skeleton className="h-5 w-96" />
          </div>
          <div className="grid gap-6 md:grid-cols-3 mb-8">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
          <div className="grid gap-6 md:grid-cols-2 mb-8">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-64 w-full" />
            ))}
          </div>
          <Skeleton className="h-32 w-full" />
        </div>
      }
    >
      <DpaContent />
    </Suspense>
  );
}
