import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

export const TaskDescriptionEditor = dynamic(
  () =>
    import("./task-description-editor").then((mod) => ({
      default: mod.TaskDescriptionEditor,
    })),
  {
    ssr: false,
    loading: () => <Skeleton className="h-32 w-full rounded-lg" />,
  },
);
