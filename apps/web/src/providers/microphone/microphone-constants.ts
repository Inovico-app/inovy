/**
 * Constants for microphone provider
 */

/**
 * MediaRecorder timeslice interval (milliseconds)
 * Data is collected every 250ms
 */
export const MEDIA_RECORDER_TIMESLICE = 250;

/**
 * Minimum gain value
 */
export const MIN_GAIN = 0.0;

/**
 * Maximum gain value
 */
export const MAX_GAIN = 3.0;

/**
 * Audio constraints for getUserMedia
 */
export const AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  noiseSuppression: true,
  echoCancellation: true,
};
