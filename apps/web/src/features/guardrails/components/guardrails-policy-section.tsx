import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ShieldCheckIcon } from "lucide-react";
import { loadOrganizationGuardrailsPolicy } from "../server/guardrails-policy.loader";
import { GuardrailsPolicyForm } from "./guardrails-policy-form";

interface GuardrailsPolicySectionProps {
  organizationId: string;
  canEdit: boolean;
}

export async function GuardrailsPolicySection({
  organizationId,
  canEdit,
}: GuardrailsPolicySectionProps) {
  const { orgPolicy } = await loadOrganizationGuardrailsPolicy(organizationId);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <ShieldCheckIcon className="h-5 w-5 text-emerald-500" />
          <div>
            <CardTitle>AI Safety</CardTitle>
            <CardDescription>
              Configure guardrails for all AI interactions across the
              organization
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <GuardrailsPolicyForm
          policy={orgPolicy}
          scope="organization"
          scopeId={organizationId}
          canEdit={canEdit}
        />
      </CardContent>
    </Card>
  );
}
