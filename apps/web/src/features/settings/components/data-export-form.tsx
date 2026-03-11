"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, FileDown, Loader2 } from "lucide-react";

interface DataExportFormProps {
  startDate: string;
  setStartDate: (value: string) => void;
  endDate: string;
  setEndDate: (value: string) => void;
  selectedProjectId: string;
  setSelectedProjectId: (value: string) => void;
  projects: Array<{ id: string; name: string }>;
  isRequesting: boolean;
  onRequestExport: () => void;
}

export function DataExportForm({
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  selectedProjectId,
  setSelectedProjectId,
  projects,
  isRequesting,
  onRequestExport,
}: DataExportFormProps) {
  return (
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
        <Select
          value={selectedProjectId}
          onValueChange={(value) => setSelectedProjectId(value ?? "")}
        >
          <SelectTrigger id="project">
            <SelectValue placeholder="All projects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All projects</SelectItem>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button
        onClick={onRequestExport}
        disabled={
          isRequesting ||
          !!(startDate && !endDate) ||
          !!(!startDate && endDate)
        }
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
  );
}
