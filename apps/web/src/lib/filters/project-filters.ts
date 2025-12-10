/**
 * Project filtering utilities
 * Extracted from components for separation of concerns
 */

import type { ProjectWithRecordingCountDto } from "@/server/dto/project.dto";

/**
 * Filter projects by search query
 * @param projects - Array of projects to filter
 * @param searchQuery - Search query string (case-insensitive)
 * @returns Filtered array of projects
 */
export function filterProjectsBySearch(
  projects: ProjectWithRecordingCountDto[],
  searchQuery?: string
): ProjectWithRecordingCountDto[] {
  if (!searchQuery) {
    return projects;
  }

  const query = searchQuery.toLowerCase();
  return projects.filter((project) =>
    project.name.toLowerCase().includes(query)
  );
}

