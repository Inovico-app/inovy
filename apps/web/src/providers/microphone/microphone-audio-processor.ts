/**
 * Audio processing utilities for microphone gain control
 */

export interface AudioProcessorRefs {
  audioContext: AudioContext;
  gainNode: GainNode;
  rawStream: MediaStream;
  processedStream: MediaStream;
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
 * Create audio processing pipeline with gain control
 * @param rawStream - Raw MediaStream from getUserMedia
 * @param initialGain - Initial gain value (0.0 to 3.0)
 * @returns Audio processing refs
 */
export function createAudioProcessor(
  rawStream: MediaStream,
  initialGain: number
): AudioProcessorRefs {
  const AudioContextConstructor = getAudioContextConstructor();
  const audioContext = new AudioContextConstructor();

  // Create gain node with initial gain value
  const gainNode = audioContext.createGain();
  gainNode.gain.value = initialGain;

  // Create audio processing pipeline: source → gainNode → destination
  const source = audioContext.createMediaStreamSource(rawStream);
  const destination = audioContext.createMediaStreamDestination();

  source.connect(gainNode);
  gainNode.connect(destination);

  return {
    audioContext,
    gainNode,
    rawStream,
    processedStream: destination.stream,
  };
}

/**
 * Update gain value on an existing gain node
 */
export function updateGain(gainNode: GainNode | null, gain: number): void {
  if (gainNode) {
    gainNode.gain.value = gain;
  }
}

/**
 * Cleanup audio processing resources
 */
export function cleanupAudioProcessor(refs: AudioProcessorRefs): void {
  // Stop all tracks
  if (refs.rawStream) {
    refs.rawStream.getTracks().forEach((track) => track.stop());
  }
  if (refs.processedStream) {
    refs.processedStream.getTracks().forEach((track) => track.stop());
  }

  // Close audio context
  if (refs.audioContext && refs.audioContext.state !== "closed") {
    refs.audioContext.close().catch(console.error);
  }
}
