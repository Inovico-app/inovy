import { Suspense } from "react";
import { CreateProjectForm } from "../../../components/projects/create-project-form";

export default function CreateProjectPage() {
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

