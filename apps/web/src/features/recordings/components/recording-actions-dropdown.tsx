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
import { useState } from "react";
import { UploadRecordingModal } from "./upload-recording-modal";

interface RecordingActionsDropdownProps {
  projectId: string;
}

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
      {showUploadModal && (
        <UploadRecordingModal
          projectId={projectId}
          open={showUploadModal}
          onOpenChange={setShowUploadModal}
        />
      )}
    </>
  );
}

