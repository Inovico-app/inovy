import { Card, CardContent } from "@/components/ui/card";
import { useTranslations } from "next-intl";

interface TaskListEmptyProps {
  variant: "no-tasks" | "no-results";
  onClearFilters?: () => void;
}

export function TaskListEmpty({ variant, onClearFilters }: TaskListEmptyProps) {
  const t = useTranslations("tasks");
  if (variant === "no-tasks") {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">{t("noTasksYet")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="py-8 text-center text-muted-foreground">
      <p>{t("noTasksMatch")}</p>
      {onClearFilters && (
        <button
          onClick={onClearFilters}
          className="text-primary hover:underline mt-2"
        >
          {t("clearFilters")}
        </button>
      )}
    </div>
  );
}
