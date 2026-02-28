import { GuardrailsQueries } from "@/server/data-access/guardrails.queries";
import { GuardrailsService } from "@/server/services/guardrails.service";

export async function loadOrganizationGuardrailsPolicy(orgId: string) {
  const [orgPolicy, effectivePolicy] = await Promise.all([
    GuardrailsQueries.getOrganizationPolicy(orgId),
    GuardrailsService.getEffectivePolicy(orgId),
  ]);

  return { orgPolicy: orgPolicy ?? null, effectivePolicy };
}

export async function loadProjectGuardrailsPolicy(
  orgId: string,
  projectId: string
) {
  const [projectPolicy, orgEffectivePolicy, effectivePolicy] =
    await Promise.all([
      GuardrailsQueries.getProjectPolicy(projectId),
      GuardrailsService.getEffectivePolicy(orgId),
      GuardrailsService.getEffectivePolicy(orgId, projectId),
    ]);

  return {
    projectPolicy: projectPolicy ?? null,
    orgEffectivePolicy,
    effectivePolicy,
  };
}

export async function loadGuardrailsViolationsSummary(orgId: string) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return GuardrailsQueries.getViolationCountsByType(orgId, since);
}
