/**
 * Audio mixing utility for combining multiple MediaStreams into one.
 *
 * Ported from `src/providers/microphone/audio-mixer.ts` but decoupled from
 * the React provider layer so it can be used by any AudioCaptureService.
 */

import { createAudioContext } from "@/lib/audio/create-audio-context";

export interface MixStreamsResult {
  mixedStream: MediaStream;
  destination: MediaStreamAudioDestinationNode;
  audioContext: AudioContext;
}

/**
 * Mix an array of MediaStreams into a single output stream via a shared
 * AudioContext destination node.
 *
 * Only audio tracks are connected; video tracks are ignored.
 *
 * @throws Error when none of the supplied streams contain audio tracks.
 */
export function mixStreams(
  streams: MediaStream[],
  audioContext?: AudioContext,
): MixStreamsResult {
  const ctx = audioContext ?? createAudioContext();
  const destination = ctx.createMediaStreamDestination();

  let connectedSources = 0;

  for (const stream of streams) {
    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) continue;

    const source = ctx.createMediaStreamSource(stream);
    source.connect(destination);
    connectedSources++;
  }

  if (connectedSources === 0) {
    throw new Error("No audio tracks found in the provided streams");
  }

  return {
    mixedStream: destination.stream,
    destination,
    audioContext: ctx,
  };
}
