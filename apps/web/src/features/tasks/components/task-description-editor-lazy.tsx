import dynamic from "next/dynamic";

export const TaskDescriptionEditor = dynamic(
  () =>
    import("./task-description-editor").then((mod) => ({
      default: mod.TaskDescriptionEditor,
    })),
  { ssr: false },
);
