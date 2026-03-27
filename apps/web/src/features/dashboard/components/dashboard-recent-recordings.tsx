import { StatusBadge } from "@/features/recordings/components/status-badge";
import type { TranscriptionStatus } from "@/server/db/schema/recordings";
import { FolderIcon, MicIcon } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

interface RecentRecording {
  id: string;
  title: string;
  projectId: string;
  projectName: string;
  createdAt: Date;
  transcriptionStatus: TranscriptionStatus;
}

interface DashboardRecentRecordingsProps {
  recordings: RecentRecording[];
}

function formatRelativeDate(
  date: Date,
  t: (key: string, values?: Record<string, string | number | Date>) => string,
): string {
  const d = date instanceof Date ? date : new Date(date);
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.round(diffMs / 60_000);

  if (diffMin < 1) return t("justNow");
  if (diffMin < 60) return t("minutesAgo", { count: diffMin });
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return t("hoursAgo", { count: diffHours });
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return t("yesterday");
  if (diffDays < 7) return t("daysAgo", { count: diffDays });
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function RecordingRow({
  recording,
  t,
}: {
  recording: RecentRecording;
  t: (key: string, values?: Record<string, string | number | Date>) => string;
}) {
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
            {formatRelativeDate(recording.createdAt, t)}
          </span>
        </div>
      </div>
      <StatusBadge
        status={recording.transcriptionStatus}
        className="shrink-0"
      />
    </Link>
  );
}

async function EmptyState() {
  const t = await getTranslations("dashboard");

  return (
    <div className="flex h-[140px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
        <MicIcon className="h-5 w-5 text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground">{t("noRecordingsYet")}</p>
    </div>
  );
}

export async function DashboardRecentRecordings({
  recordings,
}: DashboardRecentRecordingsProps) {
  const t = await getTranslations("dashboard");
  const tCommon = await getTranslations("common");
  const recent = recordings.slice(0, 3);

  return (
    <section aria-label={t("recentRecordingsAriaLabel")}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight">
          {t("recentRecordingsTitle")}
        </h2>
        {recent.length > 0 && (
          <Link
            href="/recordings"
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            {tCommon("viewAll")}
          </Link>
        )}
      </div>
      {recent.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="rounded-xl border bg-card">
          <div className="divide-y">
            {recent.map((recording) => (
              <RecordingRow key={recording.id} recording={recording} t={t} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
