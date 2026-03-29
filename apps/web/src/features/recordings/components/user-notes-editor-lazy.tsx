import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

export const UserNotesEditor = dynamic(
  () =>
    import("./user-notes-editor").then((mod) => ({
      default: mod.UserNotesEditor,
    })),
  {
    ssr: false,
    loading: () => <Skeleton className="h-32 w-full rounded-lg" />,
  },
);
