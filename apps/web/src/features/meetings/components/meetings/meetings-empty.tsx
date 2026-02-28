import { CalendarIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface MeetingsEmptyProps {
  variant: "no-meetings" | "no-results";
  onClearFilters?: () => void;
}

export function MeetingsEmpty({
  variant,
  onClearFilters,
}: MeetingsEmptyProps) {
  if (variant === "no-meetings") {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <CalendarIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No meetings found</h3>
          <p className="text-muted-foreground">
            You don't have any upcoming meetings. Meetings will appear here once
            they are scheduled in your Google Calendar.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="py-12 text-center">
        <CalendarIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No meetings match your filters</h3>
        <p className="text-muted-foreground mb-4">
          Try adjusting your filters to see more meetings.
        </p>
        {onClearFilters && (
          <Button variant="outline" onClick={onClearFilters}>
            Clear filters
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
