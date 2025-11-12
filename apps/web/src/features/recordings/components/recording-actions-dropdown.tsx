"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MicIcon, PlusIcon, UploadIcon } from "lucide-react";
import Link from "next/link";
import { Activity, useState } from "react";
import { UploadRecordingModal } from "./upload-recording-modal";

interface RecordingActionsDropdownProps {
  projectId: string;
}

/**
 * Renders a dropdown with actions to create a new recording or open the upload modal.
 *
 * The dropdown trigger is a "New Recording" button. Its menu contains a "Live" item
 * that navigates to /record and an "Upload" item that opens an UploadRecordingModal
 * controlled by local state. The modal receives the provided projectId and can
 * close itself via the onOpenChange callback.
 *
 * @param projectId - Project identifier passed to the UploadRecordingModal
 * @returns A JSX element containing the dropdown menu and the conditional upload modal
 */
export function RecordingActionsDropdown({
  projectId,
}: RecordingActionsDropdownProps) {
  const [showUploadModal, setShowUploadModal] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">
            <PlusIcon className="h-4 w-4 mr-2" />
            New Recording
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {/* Live Recording */}
          <DropdownMenuItem asChild>
            <Link href="/record">
              <MicIcon className="h-4 w-4 mr-2" />
              Live
            </Link>
          </DropdownMenuItem>

          {/* Upload Recording */}
          <DropdownMenuItem onClick={() => setShowUploadModal(true)}>
            <UploadIcon className="h-4 w-4 mr-2" />
            Upload
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Upload Modal - shown when triggered from dropdown */}
      <Activity
        name="upload-recording-modal"
        mode={showUploadModal ? "visible" : "hidden"}
      >
        <UploadRecordingModal
          projectId={projectId}
          open={showUploadModal}
          onOpenChange={setShowUploadModal}
        />
      </Activity>
    </>
  );
}

