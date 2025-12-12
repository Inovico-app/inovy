import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TaskCard } from "@/features/tasks/components/task-card-with-edit";
import type { TaskDto } from "@/server/dto/task.dto";
import type { RecordingDto } from "@/server/dto/recording.dto";

interface RecordingActionItemsCardProps {
  recording: RecordingDto;
  tasks: TaskDto[];
}

export function RecordingActionItemsCard({
  recording,
  tasks,
}: RecordingActionItemsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Extracted Action Items</CardTitle>
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
            <p>No action items extracted yet</p>
            <p className="text-sm mt-2">Task extraction may still be in progress</p>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>Action items will be extracted after transcription completes</p>
            <p className="text-sm mt-2">Please wait for the transcription to finish</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


