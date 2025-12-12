export function RecordingDetailSkeleton() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="h-8 bg-muted rounded animate-pulse" />
        <div className="h-12 bg-muted rounded animate-pulse" />
        <div className="h-48 bg-muted rounded animate-pulse" />
        <div className="h-64 bg-muted rounded animate-pulse" />
        <div className="h-48 bg-muted rounded animate-pulse" />
      </div>
    </div>
  );
}


