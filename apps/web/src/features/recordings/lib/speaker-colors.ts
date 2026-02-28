/**
 * Centralized speaker color management utilities.
 * Provides consistent color mapping across all speaker-related components.
 */

// Text colors for badges — light: -700 for WCAG AA (>=4.5:1 on white), dark: unchanged
export const SPEAKER_TEXT_COLORS = [
  "text-blue-700 dark:text-blue-400",
  "text-green-700 dark:text-green-400",
  "text-purple-700 dark:text-purple-400",
  "text-amber-700 dark:text-amber-400",
  "text-pink-700 dark:text-pink-400",
  "text-indigo-700 dark:text-indigo-400",
  "text-red-700 dark:text-red-400",
  "text-teal-700 dark:text-teal-400",
] as const;

// Background and text combinations for message bubbles — light: -100 bg / -800 text, dark: unchanged
export const SPEAKER_MESSAGE_COLORS = [
  "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
  "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
  "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100",
  "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100",
  "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-100",
  "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-100",
  "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
  "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-100",
] as const;

// Background colors for message bubbles — light: -100 for visible tinting, dark: unchanged
export const SPEAKER_BG_COLORS = [
  "bg-blue-100 dark:bg-blue-950",
  "bg-green-100 dark:bg-green-950",
  "bg-purple-100 dark:bg-purple-950",
  "bg-amber-100 dark:bg-amber-950",
  "bg-pink-100 dark:bg-pink-950",
  "bg-indigo-100 dark:bg-indigo-950",
  "bg-red-100 dark:bg-red-950",
  "bg-teal-100 dark:bg-teal-950",
] as const;

// Avatar background colors — light: -300 for stronger distinction, dark: unchanged
export const SPEAKER_AVATAR_COLORS = [
  "bg-blue-300 dark:bg-blue-800",
  "bg-green-300 dark:bg-green-800",
  "bg-purple-300 dark:bg-purple-800",
  "bg-amber-300 dark:bg-amber-800",
  "bg-pink-300 dark:bg-pink-800",
  "bg-indigo-300 dark:bg-indigo-800",
  "bg-red-300 dark:bg-red-800",
  "bg-teal-300 dark:bg-teal-800",
] as const;

// Badge/chip background colors for speaker labels — light: /20 for better visibility, dark: unchanged
export const SPEAKER_BADGE_BG_COLORS = [
  "bg-blue-500/20 dark:bg-blue-400/10",
  "bg-green-500/20 dark:bg-green-400/10",
  "bg-purple-500/20 dark:bg-purple-400/10",
  "bg-amber-500/20 dark:bg-amber-400/10",
  "bg-pink-500/20 dark:bg-pink-400/10",
  "bg-indigo-500/20 dark:bg-indigo-400/10",
  "bg-red-500/20 dark:bg-red-400/10",
  "bg-teal-500/20 dark:bg-teal-400/10",
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
 * Gets badge/chip background color class for a speaker label.
 * @param speakerIndex - The speaker index (0-based)
 * @returns Badge background color class string
 */
export function getSpeakerBadgeBgColor(speakerIndex: number): string {
  const colorIndex = speakerIndex % SPEAKER_BADGE_BG_COLORS.length;
  return SPEAKER_BADGE_BG_COLORS[colorIndex];
}

/**
 * Gets all color classes for a speaker (text, background, avatar, badge).
 * Useful for components that need multiple color values.
 * @param speakerIndex - The speaker index (0-based)
 * @returns Object with text, message, bg, avatar, and badge color classes
 */
export function getSpeakerColors(speakerIndex: number): {
  text: string;
  message: string;
  bg: string;
  avatar: string;
  badgeBg: string;
} {
  return {
    text: getSpeakerTextColor(speakerIndex),
    message: getSpeakerMessageColor(speakerIndex),
    bg: getSpeakerBgColor(speakerIndex),
    avatar: getSpeakerAvatarColor(speakerIndex),
    badgeBg: getSpeakerBadgeBgColor(speakerIndex),
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
): colorClass is (typeof SPEAKER_TEXT_COLORS)[number] {
  return (SPEAKER_TEXT_COLORS as readonly string[]).includes(colorClass);
}

