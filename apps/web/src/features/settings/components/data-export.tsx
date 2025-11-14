"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Download, Loader2, FileDown, Calendar, AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { requestDataExport, getExportHistory } from "../actions/export-user-data";
import { getUserProjects } from "@/features/projects/actions/get-user-projects";
import { format } from "date-fns";
import type { DataExport } from "@/server/db/schema";

export function DataExport() {
  const [isRequesting, setIsRequesting] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [exports, setExports] = useState<DataExport[]>([]);
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);
  
  // Form state
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");

  useEffect(() => {
    loadHistory();
    loadProjects();
  }, []);

  async function loadHistory() {
    setIsLoadingHistory(true);
    try {
      const result = await getExportHistory({});
      if (result.data?.success && result.data.exports) {
        setExports(result.data.exports);
      } else {
        toast.error(result.serverError || "Failed to load export history");
      }
    } catch (error) {
      toast.error("Failed to load export history");
    } finally {
      setIsLoadingHistory(false);
    }
  }

  async function loadProjects() {
    try {
      const result = await getUserProjects();
      if (result.success && result.data) {
        setProjects(result.data);
      }
    } catch (error) {
      // Silently fail - projects filter is optional
    }
  }

  async function handleRequestExport() {
    setIsRequesting(true);
    try {
      const filters: {
        dateRange?: { startDate: Date; endDate: Date };
        projectId?: string;
      } = {};

      if (startDate && endDate) {
        filters.dateRange = {
          startDate: new Date(startDate),
          endDate: new Date(endDate),
        };
      }

      if (selectedProjectId) {
        filters.projectId = selectedProjectId;
      }

      const result = await requestDataExport(
        Object.keys(filters).length > 0 ? filters : {}
      );

      if (result.data?.success) {
        toast.success("Export request created. Your export will be ready shortly.");
        // Reset form
        setStartDate("");
        setEndDate("");
        setSelectedProjectId("");
        // Reload history
        await loadHistory();
      } else {
        toast.error(result.serverError || "Failed to create export request");
      }
    } catch (error) {
      toast.error("Failed to create export request");
    } finally {
      setIsRequesting(false);
    }
  }

  function handleDownload(export_: DataExport) {
    if (!export_.downloadUrl) {
      toast.error("Download URL not available");
      return;
    }

    if (export_.expiresAt < new Date()) {
      toast.error("This export has expired. Please request a new export.");
      return;
    }

    // Open download URL in new tab
    window.open(export_.downloadUrl, "_blank");
  }

  function formatFileSize(bytes: number | null | undefined): string {
    if (!bytes) return "Unknown";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function getStatusBadge(status: DataExport["status"]) {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            Pending
          </Badge>
        );
      case "processing":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            Processing
          </Badge>
        );
      case "completed":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            Completed
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            Failed
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  }

  const isExpired = (expiresAt: Date) => expiresAt < new Date();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Data Export</CardTitle>
        <CardDescription>
          Export all your personal data in compliance with GDPR. Your export will be available for 7 days.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Request Form */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold">Request New Export</h3>
          
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date (Optional)</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                max={endDate || new Date().toISOString().split("T")[0]}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date (Optional)</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                max={new Date().toISOString().split("T")[0]}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="project">Project (Optional)</Label>
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
              <SelectTrigger id="project">
                <SelectValue placeholder="All projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All projects</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleRequestExport}
            disabled={isRequesting || !!(startDate && !endDate) || !!(!startDate && endDate)}
            className="w-full"
          >
            {isRequesting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Export...
              </>
            ) : (
              <>
                <FileDown className="mr-2 h-4 w-4" />
                Request Data Export
              </>
            )}
          </Button>

          {(startDate && !endDate) || (!startDate && endDate) ? (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Please provide both start and end dates, or leave both empty.
            </p>
          ) : null}
        </div>

        {/* Export History */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold">Export History</h3>
          
          {isLoadingHistory ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : exports.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              No exports yet. Request your first export above.
            </p>
          ) : (
            <div className="space-y-3">
              {exports.map((export_) => (
                <div
                  key={export_.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      {getStatusBadge(export_.status)}
                      {isExpired(export_.expiresAt) && (
                        <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">
                          Expired
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(export_.createdAt), "MMM d, yyyy 'at' h:mm a")}
                        </span>
                        {export_.fileSize && (
                          <span>{formatFileSize(export_.fileSize)}</span>
                        )}
                      </div>
                      <div className="text-xs">
                        {export_.recordingsCount} recordings, {export_.tasksCount} tasks, {export_.conversationsCount} conversations
                      </div>
                      {export_.errorMessage && (
                        <p className="text-xs text-red-600">{export_.errorMessage}</p>
                      )}
                    </div>
                  </div>
                  <div className="ml-4">
                    {export_.status === "completed" && export_.downloadUrl && !isExpired(export_.expiresAt) ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(export_)}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </Button>
                    ) : export_.status === "processing" ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Processing...
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

