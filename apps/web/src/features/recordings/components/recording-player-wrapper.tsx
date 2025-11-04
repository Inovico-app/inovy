"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

interface RecordingPlayerWrapperProps {
  fileUrl: string;
  fileMimeType: string;
  fileName: string;
  isVideo: boolean;
  isAudio: boolean;
}

export function RecordingPlayerWrapper({
  fileUrl,
  fileMimeType,
  fileName,
  isVideo,
  isAudio,
}: RecordingPlayerWrapperProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const searchParams = useSearchParams();

  // Handle timestamp navigation from URL
  useEffect(() => {
    const timestamp = searchParams.get("t");
    if (timestamp) {
      const seconds = parseInt(timestamp, 10);
      if (!isNaN(seconds)) {
        // Wait for media to be ready
        const mediaElement = isVideo ? videoRef.current : audioRef.current;
        if (mediaElement) {
          const seekToTimestamp = () => {
            mediaElement.currentTime = seconds;
            // Auto-play after seeking (optional, remove if not desired)
            mediaElement.play().catch(() => {
              // Auto-play might be blocked by browser, that's okay
            });
          };

          // If metadata is already loaded, seek immediately
          if (mediaElement.readyState >= 1) {
            seekToTimestamp();
          } else {
            // Otherwise wait for metadata to load
            mediaElement.addEventListener("loadedmetadata", seekToTimestamp, {
              once: true,
            });
          }
        }
      }
    }
  }, [searchParams, isVideo, isAudio]);

  if (isVideo) {
    return (
      <video
        ref={videoRef}
        controls
        className="w-full rounded-lg"
        preload="metadata"
        controlsList="nodownload"
      >
        <source src={fileUrl} type={fileMimeType} />
        Your browser does not support the video player.
      </video>
    );
  }

  if (isAudio) {
    return (
      <audio
        ref={audioRef}
        controls
        className="w-full"
        preload="metadata"
        controlsList="nodownload"
      >
        <source src={fileUrl} type={fileMimeType} />
        Your browser does not support the audio player.
      </audio>
    );
  }

  return (
    <div className="text-center py-8 text-muted-foreground">
      <p>Playback not supported for this file type</p>
      <Button variant="outline" className="mt-4" asChild>
        <a href={fileUrl} download={fileName}>
          Download File
        </a>
      </Button>
    </div>
  );
}

