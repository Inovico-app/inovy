import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { GuardrailsQueries } from "@/server/data-access/guardrails.queries";
import { AlertTriangleIcon } from "lucide-react";
import { loadGuardrailsViolationsSummary } from "../server/guardrails-policy.loader";
import { GuardrailsViolationsTable } from "./guardrails-violations-table";

interface GuardrailsViolationsSectionProps {
  organizationId: string;
}

export async function GuardrailsViolationsSection({
  organizationId,
}: GuardrailsViolationsSectionProps) {
  const [{ violations, total }, counts] = await Promise.all([
    GuardrailsQueries.getViolations({
      organizationId,
      page: 1,
      limit: 20,
    }),
    loadGuardrailsViolationsSummary(organizationId),
  ]);

  const totalCount = Object.values(counts).reduce(
    (sum, c) => sum + c,
    0
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertTriangleIcon className="h-5 w-5 text-amber-500" />
          <div>
            <CardTitle>Violations Log</CardTitle>
            <CardDescription>
              Guardrails violations in the last 24 hours
            </CardDescription>
          </div>
        </div>
        {totalCount > 0 && (
          <div className="flex gap-4 mt-2">
            <div className="text-sm">
              <span className="font-semibold">{totalCount}</span>{" "}
              <span className="text-muted-foreground">total (24h)</span>
            </div>
            {Object.entries(counts).map(([type, count]) => (
              <div key={type} className="text-sm">
                <span className="font-semibold">{count}</span>{" "}
                <span className="text-muted-foreground capitalize">
                  {type}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <GuardrailsViolationsTable
          organizationId={organizationId}
          initialViolations={violations}
          initialTotal={total}
        />
      </CardContent>
    </Card>
  );
}
