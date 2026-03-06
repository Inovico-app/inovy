import type { LucideIcon } from "lucide-react";
import {
  AlertCircle,
  CheckSquare,
  FolderOpen,
  Loader2,
  Mic,
  Search,
} from "lucide-react";
import type { ToolPart } from "../types";

interface ToolResultCardProps {
  toolName: string;
  part: ToolPart;
}

const toolMeta: Record<string, { icon: LucideIcon; label: string }> = {
  listProjects: { icon: FolderOpen, label: "Projects" },
  listRecordings: { icon: Mic, label: "Recordings" },
  listTasks: { icon: CheckSquare, label: "Tasks" },
  searchKnowledge: { icon: Search, label: "Knowledge Search" },
};

function getToolMeta(toolName: string) {
  return toolMeta[toolName] ?? { icon: Search, label: formatToolName(toolName) };
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
  const data = output as {
    recordings?: Array<{
      id: string;
      title: string;
      projectName: string | null;
      status: string;
      recordingDate: Date | string | null;
      duration: number | null;
    }>;
    total?: number;
    error?: string;
  };

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

const statusStyles: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  in_progress: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  completed: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

const priorityStyles: Record<string, string> = {
  urgent: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  medium: "bg-muted text-muted-foreground",
  low: "bg-muted text-muted-foreground",
};

function formatStatus(status: string): string {
  return status.replace(/_/g, " ");
}

function TasksResult({ output }: { output: unknown }) {
  const data = output as {
    tasks?: Array<{
      id: string;
      title: string;
      description: string | null;
      status: string;
      priority: string;
      assigneeName: string | null;
      dueDate: Date | string | null;
    }>;
    total?: number;
    error?: string;
  };

  if (data.error) {
    return <p className="text-sm text-destructive">{data.error}</p>;
  }

  if (!data.tasks?.length) {
    return <p className="text-sm text-muted-foreground">No tasks found.</p>;
  }

  return (
    <div className="space-y-1.5">
      {data.tasks.map((task) => (
        <div
          key={task.id}
          className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
        >
          <CheckSquare className="size-4 shrink-0 text-muted-foreground" />
          <span className="font-medium">{task.title}</span>
          {task.assigneeName && (
            <span className="text-xs text-muted-foreground">
              &middot; {task.assigneeName}
            </span>
          )}
          <span className="ml-auto flex items-center gap-1.5">
            <span
              className={`rounded-full px-2 py-0.5 text-xs capitalize ${statusStyles[task.status] ?? "bg-muted"}`}
            >
              {formatStatus(task.status)}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs capitalize ${priorityStyles[task.priority] ?? "bg-muted"}`}
            >
              {task.priority}
            </span>
          </span>
        </div>
      ))}
      {(data.total ?? 0) > data.tasks.length && (
        <p className="text-xs text-muted-foreground">
          Showing {data.tasks.length} of {data.total} tasks
        </p>
      )}
    </div>
  );
}

const sourceTypeStyles: Record<string, string> = {
  transcription: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  summary: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  task: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  project_template: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  organization_instructions: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  knowledge_document: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
};

function KnowledgeSearchResult({ output }: { output: unknown }) {
  const data = output as {
    results?: Array<{
      content: string;
      score: number;
      sourceType: string;
      title: string | null;
      source: string | null;
      recordingDate: string | null;
    }>;
    total?: number;
    message?: string;
    error?: string;
  };

  if (data.error) {
    return <p className="text-sm text-destructive">{data.error}</p>;
  }

  if (!data.results?.length) {
    return (
      <p className="text-sm text-muted-foreground">
        {data.message ?? "No results found."}
      </p>
    );
  }

  return (
    <div className="space-y-1.5">
      {data.results.map((result, index) => (
        <div
          key={index}
          className="space-y-1 rounded-md border px-3 py-2 text-sm"
        >
          <div className="flex items-center gap-2">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <span className="font-medium">
              {result.title ?? result.source ?? "Untitled"}
            </span>
            <span className="ml-auto flex items-center gap-1.5">
              <span
                className={`rounded-full px-2 py-0.5 text-xs capitalize ${sourceTypeStyles[result.sourceType] ?? "bg-muted"}`}
              >
                {formatStatus(result.sourceType)}
              </span>
              <span className="text-xs text-muted-foreground">
                {result.score.toFixed(2)}
              </span>
            </span>
          </div>
          <p className="line-clamp-2 text-xs text-muted-foreground">
            {result.content}
          </p>
        </div>
      ))}
      {(data.total ?? 0) > data.results.length && (
        <p className="text-xs text-muted-foreground">
          Showing {data.results.length} of {data.total} results
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
    case "listTasks":
      return <TasksResult output={output} />;
    case "searchKnowledge":
      return <KnowledgeSearchResult output={output} />;
    default:
      return (
        <pre className="max-h-40 overflow-auto rounded-md bg-muted p-2 text-xs">
          {JSON.stringify(output, null, 2)}
        </pre>
      );
  }
}

function LoadingSkeleton({ toolName }: { toolName: string }) {
  const rows = toolName === "searchKnowledge" ? 2 : 3;
  return (
    <div className="space-y-1.5">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-2 rounded-md border border-border/30 px-3 py-2"
        >
          <div className="size-4 shrink-0 animate-pulse rounded bg-muted" />
          <div
            className="h-3.5 animate-pulse rounded bg-muted"
            style={{ width: `${60 + (i * 15) % 30}%`, animationDelay: `${i * 100}ms` }}
          />
          <div
            className="ml-auto h-3 w-12 animate-pulse rounded-full bg-muted"
            style={{ animationDelay: `${i * 100 + 50}ms` }}
          />
        </div>
      ))}
    </div>
  );
}

export function ToolResultCard({ toolName, part }: ToolResultCardProps) {
  const { icon: Icon, label } = getToolMeta(toolName);
  const isLoading =
    part.state === "input-streaming" || part.state === "input-available";

  if (isLoading) {
    return (
      <div className="my-2 animate-in fade-in slide-in-from-bottom-2 rounded-lg border border-border/50 bg-muted/30 p-3 duration-200">
        <div className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2 className="size-3 animate-spin" />
          <span>Searching {label}...</span>
        </div>
        <LoadingSkeleton toolName={toolName} />
      </div>
    );
  }

  if (part.state === "output-error") {
    return (
      <div className="my-2 animate-in fade-in rounded-lg border border-destructive/50 bg-destructive/5 p-3 duration-200">
        <div className="mb-1 flex items-center gap-1.5 text-xs text-destructive">
          <AlertCircle className="size-3" />
          <span>{label} failed</span>
        </div>
        <p className="text-sm text-destructive">{part.errorText ?? "Unknown error"}</p>
      </div>
    );
  }

  return (
    <div className="my-2 animate-in fade-in slide-in-from-bottom-2 rounded-lg border border-border/50 bg-muted/30 p-3 duration-200">
      <div className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-3" />
        <span>{label}</span>
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
