import dynamic from "next/dynamic";

export const UserNotesEditor = dynamic(
  () =>
    import("./user-notes-editor").then((mod) => ({
      default: mod.UserNotesEditor,
    })),
  { ssr: false },
);
