/**
 * Audio mixing utilities for combining multiple audio sources
 */

export interface AudioMixerRefs {
  audioContext: AudioContext;
  mixedStream: MediaStream;
  microphoneSource: MediaStreamAudioSourceNode | null;
  systemAudioSource: MediaStreamAudioSourceNode | null;
}

/**
 * Get AudioContext constructor (handles browser compatibility)
 * @throws Error if Web Audio API is not supported
 */
function getAudioContextConstructor(): typeof AudioContext {
  const AudioContextConstructor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext })
      .webkitAudioContext;

  if (!AudioContextConstructor) {
    throw new Error(
      "Web Audio API is not supported in this environment. Please use a modern browser."
    );
  }

  return AudioContextConstructor;
}

/**
 * Mix multiple audio streams into a single MediaStream
 * @param streams - Array of MediaStreams to mix
 * @returns Audio mixer refs with mixed stream
 */
export function mixAudioStreams(
  streams: MediaStream[]
): AudioMixerRefs {
  const AudioContextConstructor = getAudioContextConstructor();
  const audioContext = new AudioContextConstructor();

  // Create destination for mixed audio
  const destination = audioContext.createMediaStreamDestination();

  // Create sources from each stream and connect to destination
  const sources: MediaStreamAudioSourceNode[] = [];

  for (const stream of streams) {
    // Only process streams that have audio tracks
    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length > 0) {
      try {
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(destination);
        sources.push(source);
      } catch (error) {
        console.warn("Failed to create audio source from stream:", error);
      }
    }
  }

  if (sources.length === 0) {
    throw new Error("No audio tracks found in provided streams");
  }

  return {
    audioContext,
    mixedStream: destination.stream,
    microphoneSource: sources[0] || null,
    systemAudioSource: sources[1] || null,
  };
}

/**
 * Mix microphone and system audio streams
 * @param microphoneStream - Microphone MediaStream (optional)
 * @param systemAudioStream - System audio MediaStream (optional)
 * @returns Audio mixer refs with mixed stream
 * @throws Error if both streams are null or have no audio tracks
 */
export function mixMicrophoneAndSystemAudio(
  microphoneStream: MediaStream | null,
  systemAudioStream: MediaStream | null
): AudioMixerRefs {
  const streams: MediaStream[] = [];

  if (microphoneStream) {
    const micAudioTracks = microphoneStream.getAudioTracks();
    if (micAudioTracks.length > 0) {
      streams.push(microphoneStream);
    }
  }

  if (systemAudioStream) {
    const systemAudioTracks = systemAudioStream.getAudioTracks();
    if (systemAudioTracks.length > 0) {
      streams.push(systemAudioStream);
    }
  }

  if (streams.length === 0) {
    throw new Error(
      "At least one audio stream with audio tracks is required for mixing"
    );
  }

  return mixAudioStreams(streams);
}

/**
 * Cleanup audio mixer resources
 * @param refs - Audio mixer refs to cleanup
 */
export function cleanupAudioMixer(refs: AudioMixerRefs): void {
  // Stop all tracks in the mixed stream
  if (refs.mixedStream) {
    refs.mixedStream.getTracks().forEach((track) => track.stop());
  }

  // Disconnect sources (they will be garbage collected)
  // Note: We can't explicitly disconnect MediaStreamAudioSourceNode,
  // but stopping the tracks will stop the audio flow

  // Close audio context
  if (refs.audioContext && refs.audioContext.state !== "closed") {
    refs.audioContext.close().catch(console.error);
  }
}
