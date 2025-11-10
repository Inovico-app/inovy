"use server";

import { cookies } from "next/headers";
import { AUTO_PROCESS_COOKIE_NAME } from "./recording-preferences";

/**
 * Cookie options for recording preferences
 */
const COOKIE_OPTIONS = {
  httpOnly: false, // Needs to be readable from client
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  maxAge: 60 * 60 * 24 * 365, // 1 year
  path: "/",
};

/**
 * Get the auto-process preference from cookies (server-side)
 * Returns false by default (opt-in behavior)
 */
export async function getAutoProcessPreference(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const value = cookieStore.get(AUTO_PROCESS_COOKIE_NAME)?.value;
    return value === "true";
  } catch (error) {
    console.error("Failed to read auto-process preference:", error);
    return false; // Default to false on error
  }
}

/**
 * Set the auto-process preference in cookies (server action)
 * @param enabled - Whether auto-processing should be enabled
 */
export async function setAutoProcessPreference(
  enabled: boolean
): Promise<void> {
  try {
    const cookieStore = await cookies();
    cookieStore.set(
      AUTO_PROCESS_COOKIE_NAME,
      String(enabled),
      COOKIE_OPTIONS
    );
  } catch (error) {
    console.error("Failed to set auto-process preference:", error);
    throw new Error("Failed to update preference");
  }
}

