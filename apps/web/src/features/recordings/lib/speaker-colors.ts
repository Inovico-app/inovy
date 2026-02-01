/**
 * Centralized speaker color management utilities.
 * Provides consistent color mapping across all speaker-related components.
 */

// Text colors for badges (light mode: darker text, dark mode: lighter text)
export const SPEAKER_TEXT_COLORS = [
  "text-blue-600 dark:text-blue-400",
  "text-green-600 dark:text-green-400",
  "text-purple-600 dark:text-purple-400",
  "text-amber-600 dark:text-amber-400",
  "text-pink-600 dark:text-pink-400",
  "text-red-600 dark:text-red-400",
  "text-cyan-600 dark:text-cyan-400",
  "text-orange-600 dark:text-orange-400",
] as const;

// Background and text combinations for message bubbles
export const SPEAKER_MESSAGE_COLORS = [
  "bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100",
  "bg-green-100 text-green-900 dark:bg-green-900 dark:text-green-100",
  "bg-purple-100 text-purple-900 dark:bg-purple-900 dark:text-purple-100",
  "bg-amber-100 text-amber-900 dark:bg-amber-900 dark:text-amber-100",
  "bg-pink-100 text-pink-900 dark:bg-pink-900 dark:text-pink-100",
  "bg-indigo-100 text-indigo-900 dark:bg-indigo-900 dark:text-indigo-100",
] as const;

// Background colors for message bubbles
export const SPEAKER_BG_COLORS = [
  "bg-blue-50 dark:bg-blue-950",
  "bg-green-50 dark:bg-green-950",
  "bg-purple-50 dark:bg-purple-950",
  "bg-amber-50 dark:bg-amber-950",
  "bg-pink-50 dark:bg-pink-950",
  "bg-indigo-50 dark:bg-indigo-950",
] as const;

// Avatar background colors
export const SPEAKER_AVATAR_COLORS = [
  "bg-blue-200 dark:bg-blue-800",
  "bg-green-200 dark:bg-green-800",
  "bg-purple-200 dark:bg-purple-800",
  "bg-amber-200 dark:bg-amber-800",
  "bg-pink-200 dark:bg-pink-800",
  "bg-indigo-200 dark:bg-indigo-800",
] as const;

/**
 * Gets text color class for a speaker badge.
 * @param speakerIndex - The speaker index (0-based)
 * @returns Text color class string
 */
export function getSpeakerTextColor(speakerIndex: number): string {
  const colorIndex = speakerIndex % SPEAKER_TEXT_COLORS.length;
  return SPEAKER_TEXT_COLORS[colorIndex];
}

/**
 * Gets message bubble color class (background + text combination).
 * @param speakerIndex - The speaker index (0-based)
 * @returns Message color class string
 */
export function getSpeakerMessageColor(speakerIndex: number): string {
  const colorIndex = speakerIndex % SPEAKER_MESSAGE_COLORS.length;
  return SPEAKER_MESSAGE_COLORS[colorIndex];
}

/**
 * Gets background color class for a speaker message bubble.
 * @param speakerIndex - The speaker index (0-based)
 * @returns Background color class string
 */
export function getSpeakerBgColor(speakerIndex: number): string {
  const colorIndex = speakerIndex % SPEAKER_BG_COLORS.length;
  return SPEAKER_BG_COLORS[colorIndex];
}

/**
 * Gets avatar background color class for a speaker.
 * @param speakerIndex - The speaker index (0-based)
 * @returns Avatar color class string
 */
export function getSpeakerAvatarColor(speakerIndex: number): string {
  const colorIndex = speakerIndex % SPEAKER_AVATAR_COLORS.length;
  return SPEAKER_AVATAR_COLORS[colorIndex];
}

/**
 * Gets all color classes for a speaker (text, background, avatar).
 * Useful for components that need multiple color values.
 * @param speakerIndex - The speaker index (0-based)
 * @returns Object with text, message, bg, and avatar color classes
 */
export function getSpeakerColors(speakerIndex: number): {
  text: string;
  message: string;
  bg: string;
  avatar: string;
} {
  return {
    text: getSpeakerTextColor(speakerIndex),
    message: getSpeakerMessageColor(speakerIndex),
    bg: getSpeakerBgColor(speakerIndex),
    avatar: getSpeakerAvatarColor(speakerIndex),
  };
}

/**
 * Validates if a text color class is in the allowed whitelist.
 * Used for XSS prevention when accepting color classes from external sources.
 * @param colorClass - The color class to validate
 * @returns True if the color is in the whitelist, false otherwise
 */
export function isValidSpeakerTextColor(
  colorClass: string
): colorClass is typeof SPEAKER_TEXT_COLORS[number] {
  return (SPEAKER_TEXT_COLORS as readonly string[]).includes(colorClass);
}
