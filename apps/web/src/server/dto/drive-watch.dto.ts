/**
 * Drive Watch DTOs
 * Data transfer objects for Google Drive watch subscriptions
 */

/**
 * Base Drive Watch DTO
 * Public-facing watch data
 */
export interface DriveWatchDto {
  id: string;
  folderId: string;
  projectId: string;
  organizationId: string;
  expiresAt: Date; // Expiration timestamp as Date
  isActive: boolean;
  folderName: string | null; // From Drive API, can be null if not fetched
}

/**
 * Drive Watch List Item DTO
 * Extends base DTO with computed fields for list display
 */
export interface DriveWatchListItemDto extends DriveWatchDto {
  isExpired: boolean; // Computed: true if expiresAt < now
  expiresIn: number | null; // Computed: milliseconds until expiration (null if expired)
  projectName: string; // From joined projects table
}

/**
 * Drive Watch List DTO
 * Array of watch items with computed expiration status
 */
export type DriveWatchListDto = DriveWatchListItemDto[];

