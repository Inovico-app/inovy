/**
 * Get AudioContext constructor with browser compatibility
 * Handles webkitAudioContext fallback for older browsers
 * @throws Error if Web Audio API is not supported
 */
export function createAudioContext(): AudioContext {
  const AudioContextConstructor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext })
      .webkitAudioContext;

  if (!AudioContextConstructor) {
    throw new Error(
      "Web Audio API is not supported in this environment. Please use a modern browser."
    );
  }

  return new AudioContextConstructor();
}
