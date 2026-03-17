/**
 * Detect Safari (iOS and macOS).
 *
 * Safari's WebKit engine does not reliably persist cookies set via
 * `Set-Cookie` headers in `fetch()` responses before a subsequent
 * client-side navigation occurs. Use this check to decide between a
 * hard navigation (`window.location.href`) and a soft one (`router.push`).
 */
export function isSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  // Safari includes "Safari" but NOT "Chrome" / "Chromium" / "Android"
  return /safari/i.test(ua) && !/chrome|chromium|android/i.test(ua);
}
