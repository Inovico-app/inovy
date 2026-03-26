import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateNL } from "@/lib/formatters/date-formatters";
import type { WorksCouncilApproval } from "@/server/db/schema/works-council-approvals";
import { ShieldCheckIcon, FileUpIcon, XCircleIcon } from "lucide-react";
import { WorksCouncilForm } from "./works-council-form";

interface WorksCouncilDashboardProps {
  activeApproval: WorksCouncilApproval | null;
  approvals: WorksCouncilApproval[];
}

export function WorksCouncilDashboard({
  activeApproval,
  approvals,
}: WorksCouncilDashboardProps) {
  return (
    <div className="container mx-auto max-w-6xl py-6 px-4 md:py-12 md:px-6">
      <div className="mb-10">
        <h1 className="text-3xl font-bold">Ondernemingsraad</h1>
        <p className="text-muted-foreground mt-2">
          Registreer een OR-goedkeuring voor het opnemen van vergaderingen.
          Individuele medewerkers behouden het recht om zich af te melden.
        </p>
      </div>

      {activeApproval ? (
        <ActiveApprovalCard approval={activeApproval} />
      ) : (
        <NoApprovalCard />
      )}

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileUpIcon className="h-5 w-5" />
            {activeApproval
              ? "Nieuwe OR-goedkeuring registreren"
              : "OR-goedkeuring registreren"}
          </CardTitle>
          <CardDescription>
            Upload het OR-goedkeuringsdocument (PDF) met de datum en reikwijdte
            van de goedkeuring.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WorksCouncilForm />
        </CardContent>
      </Card>

      {approvals.length > 0 && <ApprovalHistory approvals={approvals} />}
    </div>
  );
}

function ActiveApprovalCard({ approval }: { approval: WorksCouncilApproval }) {
  return (
    <Card className="mb-8 border-emerald-500/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheckIcon className="h-5 w-5 text-emerald-500" />
          Actieve OR-goedkeuring
        </CardTitle>
        <CardDescription>
          Goedgekeurd op {formatDateNL(approval.approvalDate)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {approval.scopeDescription && (
          <div>
            <p className="text-sm font-medium">Reikwijdte</p>
            <p className="text-sm text-muted-foreground">
              {approval.scopeDescription}
            </p>
          </div>
        )}
        <div>
          <p className="text-sm font-medium">Document</p>
          <a
            href={approval.documentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline"
          >
            OR-goedkeuringsdocument bekijken
          </a>
        </div>
        <Badge variant="default" className="bg-emerald-500">
          Actief
        </Badge>
      </CardContent>
    </Card>
  );
}

function NoApprovalCard() {
  return (
    <Card className="mb-8 border-amber-500/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <XCircleIcon className="h-5 w-5 text-amber-500" />
          Geen actieve OR-goedkeuring
        </CardTitle>
        <CardDescription>
          Upload een OR-goedkeuringsdocument om vergaderopnames te autoriseren
          voor alle organisatieleden.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

function ApprovalHistory({ approvals }: { approvals: WorksCouncilApproval[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Goedkeuringsgeschiedenis</CardTitle>
        <CardDescription>
          Alle OR-goedkeuringen voor deze organisatie
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {approvals.map((approval) => (
            <div
              key={approval.id}
              className="flex items-center justify-between border-b pb-3 last:border-0"
            >
              <div>
                <p className="text-sm font-medium">
                  {formatDateNL(approval.approvalDate)}
                </p>
                {approval.scopeDescription && (
                  <p className="text-xs text-muted-foreground">
                    {approval.scopeDescription}
                  </p>
                )}
              </div>
              <Badge
                variant={approval.status === "active" ? "default" : "secondary"}
              >
                {approval.status === "active" ? "Actief" : "Ingetrokken"}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
