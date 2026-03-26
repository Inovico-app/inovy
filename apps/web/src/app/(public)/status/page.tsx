import { redirect } from "next/navigation";

const STATUS_PAGE_URL =
  process.env.NEXT_PUBLIC_STATUS_PAGE_URL ?? "https://status.inovy.nl";

/**
 * Redirects to the external status page.
 * Configure via NEXT_PUBLIC_STATUS_PAGE_URL env var.
 */
export default function StatusPage() {
  redirect(STATUS_PAGE_URL);
}
