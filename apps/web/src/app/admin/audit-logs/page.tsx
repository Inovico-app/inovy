import { AuditLogViewer } from "@/features/admin/components/audit-log-viewer";
import { PageLayout } from "@/components/page-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AuditLogsPage() {
  return (
    <PageLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Audit Logs</h1>
          <p className="text-muted-foreground mt-2">
            Comprehensive audit trail for all system actions. Supports SOC 2 compliance requirements.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Audit Log Viewer</CardTitle>
            <CardDescription>
              View and filter audit logs for compliance and security monitoring.
              All logs are tamper-proof via hash chain verification.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AuditLogViewer />
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}

