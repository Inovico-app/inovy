import { Card, CardContent } from "@/components/ui/card";

interface TaskListEmptyProps {
  variant: "no-tasks" | "no-results";
  onClearFilters?: () => void;
}

export function TaskListEmpty({ variant, onClearFilters }: TaskListEmptyProps) {
  if (variant === "no-tasks") {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">
            No tasks assigned to you yet. Tasks will appear here once they are
            extracted from your recordings.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="py-8 text-center text-muted-foreground">
      <p>No tasks match the selected filters.</p>
      {onClearFilters && (
        <button
          onClick={onClearFilters}
          className="text-primary hover:underline mt-2"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}

