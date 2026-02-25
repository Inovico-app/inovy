import { StatusBadge } from "@/features/recordings/components/status-badge";
import type { RecordingStatus } from "@/server/db/schema/recordings";
import { FolderIcon, MicIcon } from "lucide-react";
import Link from "next/link";

interface RecentRecording {
  id: string;
  title: string;
  projectId: string;
  projectName: string;
  createdAt: Date;
  transcriptionStatus: string;
}

interface DashboardRecentRecordingsProps {
  recordings: RecentRecording[];
}

function formatRelativeDate(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMin = Math.round(diffMs / 60_000);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function RecordingRow({ recording }: { recording: RecentRecording }) {
  return (
    <Link
      href={`/projects/${recording.projectId}/recordings/${recording.id}`}
      className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-accent/50"
    >
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <MicIcon className="h-3.5 w-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium">{recording.title}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1 truncate">
            <FolderIcon className="h-2.5 w-2.5 shrink-0" />
            {recording.projectName}
          </span>
          <span className="shrink-0">
            {formatRelativeDate(recording.createdAt)}
          </span>
        </div>
      </div>
      <StatusBadge
        status={recording.transcriptionStatus as RecordingStatus}
        className="shrink-0"
      />
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="flex h-[140px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
        <MicIcon className="h-5 w-5 text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground">
        No recordings yet
      </p>
    </div>
  );
}

export function DashboardRecentRecordings({
  recordings,
}: DashboardRecentRecordingsProps) {
  const recent = recordings.slice(0, 3);

  return (
    <section aria-label="Recent recordings">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight">
          Recent Recordings
        </h2>
        {recent.length > 0 && (
          <Link
            href="/recordings"
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            View all
          </Link>
        )}
      </div>
      {recent.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="rounded-xl border bg-card">
          <div className="divide-y">
            {recent.map((recording) => (
              <RecordingRow key={recording.id} recording={recording} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
