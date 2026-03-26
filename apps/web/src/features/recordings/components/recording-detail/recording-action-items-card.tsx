import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TaskCard } from "@/features/tasks/components/task-card-with-edit";
import type { TaskDto } from "@/server/dto/task.dto";
import type { RecordingDto } from "@/server/dto/recording.dto";
import { getTranslations } from "next-intl/server";

interface RecordingActionItemsCardProps {
  recording: RecordingDto;
  tasks: TaskDto[];
}

export async function RecordingActionItemsCard({
  recording,
  tasks,
}: RecordingActionItemsCardProps) {
  const t = await getTranslations("recordings");
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("detail.extractedActionItems")}</CardTitle>
      </CardHeader>
      <CardContent>
        {tasks.length > 0 ? (
          <div className="space-y-4">
            {tasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        ) : recording.transcriptionStatus === "completed" ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>{t("detail.noActionItems")}</p>
            <p className="text-sm mt-2">
              {t("detail.taskExtractionInProgress")}
            </p>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>{t("detail.actionItemsAfterTranscription")}</p>
            <p className="text-sm mt-2">{t("detail.waitForTranscription")}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
