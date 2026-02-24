"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { generatePrivilegeReviewReport } from "@/features/admin/actions/privileged-access";
import { ClipboardCheckIcon, DownloadIcon, FileTextIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

export function PrivilegeReviewReport() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [report, setReport] = useState<{
    reviewDate: Date;
    privilegedUsers: Array<{
      id: string;
      email: string;
      name: string | null;
      role: string;
      lastActivity: Date | null;
      activityCount: number;
      recommendation: "keep" | "review" | "revoke";
      reason: string;
    }>;
    stats: {
      totalPrivileged: number;
      inactive: number;
      recommended_revocations: number;
    };
  } | null>(null);

  const handleGenerateReport = async () => {
    setIsLoading(true);
    try {
      const result = await generatePrivilegeReviewReport({});

      if (result?.data) {
        setReport({
          ...result.data,
          reviewDate: new Date(result.data.reviewDate),
          privilegedUsers: result.data.privilegedUsers.map((user) => ({
            ...user,
            lastActivity: user.lastActivity ? new Date(user.lastActivity) : null,
          })),
        });
        toast.success("Review report generated successfully");
      } else {
        toast.error(result?.serverError ?? "Failed to generate report");
      }
    } catch (error) {
      toast.error("Failed to generate report");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadReport = () => {
    if (!report) return;

    const markdown = generateReportMarkdown(report);
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `privilege-review-${report.reviewDate.toISOString().split("T")[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Report downloaded");
  };

  const getRecommendationBadge = (recommendation: string) => {
    switch (recommendation) {
      case "keep":
        return <Badge variant="secondary">Keep</Badge>;
      case "review":
        return <Badge variant="default">Review</Badge>;
      case "revoke":
        return <Badge variant="destructive">Revoke</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <ClipboardCheckIcon className="h-4 w-4" />
          Generate Review Report
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Privilege Review Report</DialogTitle>
          <DialogDescription>
            Quarterly review report for all privileged accounts with
            recommendations
          </DialogDescription>
        </DialogHeader>

        {!report ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Generate New Report</CardTitle>
              <CardDescription>
                Create a comprehensive review report for all privileged accounts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleGenerateReport}
                disabled={isLoading}
                className="gap-2"
              >
                <FileTextIcon className="h-4 w-4" />
                {isLoading ? "Generating..." : "Generate Report"}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Report Summary</CardTitle>
                    <CardDescription>
                      Generated on {report.reviewDate.toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <Button
                    onClick={handleDownloadReport}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                  >
                    <DownloadIcon className="h-4 w-4" />
                    Download
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-2xl font-bold">
                      {report.stats.totalPrivileged}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Total Privileged
                    </p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-amber-600">
                      {report.stats.inactive}
                    </p>
                    <p className="text-sm text-muted-foreground">Inactive</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-destructive">
                      {report.stats.recommended_revocations}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Recommended Revocations
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Review Details</CardTitle>
                <CardDescription>
                  Detailed review of each privileged account
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Last Activity</TableHead>
                      <TableHead>Actions</TableHead>
                      <TableHead>Recommendation</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.privilegedUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">
                              {user.name ?? "No name"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {user.email}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{user.role}</Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {user.lastActivity
                              ? formatDistanceToNow(user.lastActivity, {
                                  addSuffix: true,
                                })
                              : "Never"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {user.activityCount}
                          </span>
                        </TableCell>
                        <TableCell>
                          {getRecommendationBadge(user.recommendation)}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {user.reason}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function generateReportMarkdown(report: {
  reviewDate: Date;
  privilegedUsers: Array<{
    id: string;
    email: string;
    name: string | null;
    role: string;
    lastActivity: Date | null;
    activityCount: number;
    recommendation: "keep" | "review" | "revoke";
    reason: string;
  }>;
  stats: {
    totalPrivileged: number;
    inactive: number;
    recommended_revocations: number;
  };
}): string {
  const lines = [
    "# Privileged Access Review Report",
    "",
    `**Review Date:** ${report.reviewDate.toLocaleDateString()}`,
    `**Reviewer:** [To be filled]`,
    `**Review Period:** Last 90 days`,
    "",
    "## Summary",
    "",
    `- **Total Privileged Accounts:** ${report.stats.totalPrivileged}`,
    `- **Inactive Accounts:** ${report.stats.inactive}`,
    `- **Recommended Revocations:** ${report.stats.recommended_revocations}`,
    "",
    "## Detailed Review",
    "",
    "| User | Role | Last Activity | Actions | Recommendation | Reason |",
    "|------|------|---------------|---------|----------------|--------|",
  ];

  report.privilegedUsers.forEach((user) => {
    const lastActivity = user.lastActivity
      ? user.lastActivity.toLocaleDateString()
      : "Never";
    lines.push(
      `| ${user.email} | ${user.role} | ${lastActivity} | ${user.activityCount} | ${user.recommendation.toUpperCase()} | ${user.reason} |`
    );
  });

  lines.push(
    "",
    "## Actions Taken",
    "",
    "- [ ] Reviewed all accounts",
    "- [ ] Revoked unnecessary privileges",
    "- [ ] Documented justifications for retained privileges",
    "- [ ] Updated documentation",
    "",
    "## Next Review Date",
    "",
    `${new Date(report.reviewDate.getTime() + 90 * 24 * 60 * 60 * 1000).toLocaleDateString()}`,
    "",
    "---",
    "",
    "*This report was automatically generated by the Privileged Access Management system*",
    "*Compliance: SSD-7.1.02 - Extra attention for high-privilege accounts*"
  );

  return lines.join("\n");
}
