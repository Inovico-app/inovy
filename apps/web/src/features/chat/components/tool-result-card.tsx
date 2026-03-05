import { FolderOpen, Loader2, Mic, Wrench } from "lucide-react";
import type { ToolPart } from "../types";

interface ToolResultCardProps {
  toolName: string;
  part: ToolPart;
}

function ProjectsResult({ output }: { output: unknown }) {
  const data = output as {
    projects?: Array<{
      id: string;
      name: string;
      description: string | null;
      status: string;
      recordingCount: number;
      createdAt: Date | string;
    }>;
    total?: number;
    error?: string;
  };

  if (data.error) {
    return <p className="text-sm text-destructive">{data.error}</p>;
  }

  if (!data.projects?.length) {
    return <p className="text-sm text-muted-foreground">No projects found.</p>;
  }

  return (
    <div className="space-y-1.5">
      {data.projects.map((project) => (
        <div
          key={project.id}
          className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
        >
          <FolderOpen className="size-4 shrink-0 text-muted-foreground" />
          <span className="font-medium">{project.name}</span>
          <span className="ml-auto text-xs text-muted-foreground">
            {project.recordingCount} recording
            {project.recordingCount !== 1 ? "s" : ""}
          </span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize">
            {project.status}
          </span>
        </div>
      ))}
      {(data.total ?? 0) > data.projects.length && (
        <p className="text-xs text-muted-foreground">
          Showing {data.projects.length} of {data.total} projects
        </p>
      )}
    </div>
  );
}

interface Recording {
  id: string;
  title: string;
  projectName: string | null;
  status: string;
  recordingDate: Date | string | null;
  duration: number | null;
}

interface RecordingsResultData {
  recordings?: Recording[];
  total?: number;
  error?: string;
}

function isRecordingsResult(output: unknown): output is RecordingsResultData {
  if (typeof output !== "object" || output === null) return false;
  const obj = output as Record<string, unknown>;
  if ("error" in obj && typeof obj.error === "string") return true;
  if ("recordings" in obj && Array.isArray(obj.recordings)) return true;
  return false;
}

function formatDuration(seconds: number | null): string {
  if (seconds == null) return "--";
  if (seconds < 60) return `${seconds}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function RecordingsResult({ output }: { output: unknown }) {
  if (!isRecordingsResult(output)) {
    return (
      <p className="text-sm text-destructive">Unexpected recordings format.</p>
    );
  }

  const data: RecordingsResultData = output;

  if (data.error) {
    return <p className="text-sm text-destructive">{data.error}</p>;
  }

  if (!data.recordings?.length) {
    return <p className="text-sm text-muted-foreground">No recordings found.</p>;
  }

  return (
    <div className="space-y-1.5">
      {data.recordings.map((recording) => (
        <div
          key={recording.id}
          className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
        >
          <Mic className="size-4 shrink-0 text-muted-foreground" />
          <span className="font-medium">{recording.title}</span>
          {recording.projectName && (
            <span className="text-xs text-muted-foreground">
              {recording.projectName}
            </span>
          )}
          <span className="ml-auto text-xs text-muted-foreground">
            {formatDuration(recording.duration)}
          </span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize">
            {recording.status}
          </span>
        </div>
      ))}
      {(data.total ?? 0) > data.recordings.length && (
        <p className="text-xs text-muted-foreground">
          Showing {data.recordings.length} of {data.total} recordings
        </p>
      )}
    </div>
  );
}

function ToolResultContent({
  toolName,
  output,
}: {
  toolName: string;
  output: unknown;
}) {
  switch (toolName) {
    case "listProjects":
      return <ProjectsResult output={output} />;
    case "listRecordings":
      return <RecordingsResult output={output} />;
    default:
      return (
        <pre className="max-h-40 overflow-auto rounded-md bg-muted p-2 text-xs">
          {JSON.stringify(output, null, 2)}
        </pre>
      );
  }
}

export function ToolResultCard({ toolName, part }: ToolResultCardProps) {
  const isLoading =
    part.state === "input-streaming" || part.state === "input-available";

  if (isLoading) {
    return (
      <div className="my-2 flex items-center gap-2 rounded-lg border border-border/50 bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        <span>Using {formatToolName(toolName)}...</span>
      </div>
    );
  }

  if (part.state === "output-error") {
    return (
      <div className="my-2 rounded-lg border border-destructive/50 bg-destructive/5 p-3">
        <div className="mb-1 flex items-center gap-1.5 text-xs text-destructive">
          <Wrench className="size-3" />
          <span>{formatToolName(toolName)} failed</span>
        </div>
        <p className="text-sm text-destructive">{part.errorText ?? "Unknown error"}</p>
      </div>
    );
  }

  return (
    <div className="my-2 rounded-lg border border-border/50 bg-muted/30 p-3">
      <div className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Wrench className="size-3" />
        <span>{formatToolName(toolName)}</span>
      </div>
      <ToolResultContent toolName={toolName} output={part.output} />
    </div>
  );
}

function formatToolName(name: string): string {
  return name
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}
