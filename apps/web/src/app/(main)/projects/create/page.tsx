import type { Metadata } from "next";
import { CreateProjectForm } from "@/features/projects/components/create-project-form";
import { permissions } from "@/lib/permissions/engine";
import { requirePermission } from "@/lib/permissions/require-permission";
import { Suspense } from "react";

export const metadata: Metadata = { title: "Create Project" };

export default async function CreateProjectPage() {
  await requirePermission(permissions.can("project:create"));
  // CACHE COMPONENTS: Wrap form in Suspense for static shell generation
  // Forms are typically dynamic but can benefit from a static shell
  return (
    <Suspense
      fallback={
        <div className="container mx-auto py-8 px-4">
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="h-12 bg-muted rounded animate-pulse" />
            <div className="h-64 bg-muted rounded animate-pulse" />
          </div>
        </div>
      }
    >
      <div className="container mx-auto py-8 px-4">
        <CreateProjectForm />
      </div>
    </Suspense>
  );
}
