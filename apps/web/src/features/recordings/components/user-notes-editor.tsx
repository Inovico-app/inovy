"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Bold, Italic, List, ListOrdered, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCallback, useEffect, useRef, useState } from "react";
import { useUpdateUserNotesMutation } from "../hooks/use-update-user-notes-mutation";

interface UserNotesEditorProps {
  recordingId: string;
  initialNotes?: string | null;
  readOnly?: boolean;
  maxLength?: number;
}

export function UserNotesEditor({
  recordingId,
  initialNotes,
  readOnly = false,
  maxLength = 5000,
}: UserNotesEditorProps) {
  const [isSaving, setIsSaving] = useState(false);
  const mutation = useUpdateUserNotesMutation({
    onSuccess: () => {
      setIsSaving(false);
    },
  });
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const saveNotes = useCallback(
    async (markdown: string) => {
      setIsSaving(true);
      try {
        await mutation.mutateAsync({
          recordingId,
          userNotes: markdown,
        });
      } finally {
        setIsSaving(false);
      }
    },
    [recordingId, mutation]
  );

  const debouncedSave = useCallback(
    (content: string) => {
      // Clear existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      // Set new timeout
      saveTimeoutRef.current = setTimeout(() => {
        saveNotes(content);
      }, 3000);
    },
    [saveNotes]
  );

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        horizontalRule: false,
      }),
      Placeholder.configure({
        placeholder: "Add your notes here... You can use markdown formatting.",
      }),
    ],
    content: initialNotes || "",
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      const text = editor.getText();
      if (text.length <= maxLength) {
        debouncedSave(editor.getHTML());
      }
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[150px] p-4",
      },
    },
  });

  // Update editor content when initialNotes changes
  useEffect(() => {
    if (editor && initialNotes !== undefined && editor.getHTML() !== initialNotes) {
      editor.commands.setContent(initialNotes || "");
    }
  }, [editor, initialNotes]);

  if (!editor) {
    return null;
  }

  const charCount = editor.getText().length;
  const isNearLimit = charCount > maxLength * 0.9;
  const isOverLimit = charCount > maxLength;

  return (
    <div className="space-y-2">
      {!readOnly && (
        <div className="border-b pb-2 flex items-center gap-1">
          {/* Toolbar */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBold().run()}
            disabled={!editor.can().chain().focus().toggleBold().run()}
            className={editor.isActive("bold") ? "bg-muted" : ""}
            aria-label="Bold"
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            disabled={!editor.can().chain().focus().toggleItalic().run()}
            className={editor.isActive("italic") ? "bg-muted" : ""}
            aria-label="Italic"
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={editor.isActive("bulletList") ? "bg-muted" : ""}
            aria-label="Bullet List"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={editor.isActive("orderedList") ? "bg-muted" : ""}
            aria-label="Numbered List"
          >
            <ListOrdered className="h-4 w-4" />
          </Button>

          <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
            {isSaving && (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Saving...</span>
              </>
            )}
            {!isSaving && mutation.isSuccess && (
              <span className="text-green-600 dark:text-green-400">Saved</span>
            )}
          </div>
        </div>
      )}

      <div className="border rounded-md">
        <EditorContent editor={editor} />
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Markdown formatting supported</span>
        <span className={isOverLimit ? "text-destructive" : isNearLimit ? "text-yellow-600" : ""}>
          {charCount} / {maxLength} characters
        </span>
      </div>
    </div>
  );
}

