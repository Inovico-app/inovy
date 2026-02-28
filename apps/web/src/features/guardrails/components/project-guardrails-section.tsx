import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ShieldCheckIcon } from "lucide-react";
import { loadProjectGuardrailsPolicy } from "../server/guardrails-policy.loader";
import { ProjectGuardrailsForm } from "./project-guardrails-form";

interface ProjectGuardrailsSectionProps {
  projectId: string;
  organizationId: string;
  canEdit: boolean;
}

export async function ProjectGuardrailsSection({
  projectId,
  organizationId,
  canEdit,
}: ProjectGuardrailsSectionProps) {
  const { projectPolicy, orgEffectivePolicy } =
    await loadProjectGuardrailsPolicy(organizationId, projectId);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <ShieldCheckIcon className="h-5 w-5 text-emerald-500" />
          <div>
            <CardTitle>AI Safety</CardTitle>
            <CardDescription>
              Project-level guardrails — inherits from the organization policy.
              You can only make settings stricter.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ProjectGuardrailsForm
          projectPolicy={projectPolicy}
          orgPolicy={orgEffectivePolicy}
          projectId={projectId}
          canEdit={canEdit}
        />
      </CardContent>
    </Card>
  );
}
