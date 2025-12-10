/**
 * File size constants
 * Centralized file size limits and thresholds
 */

// File sizes in bytes
export const BYTES_PER_KB = 1024;
export const BYTES_PER_MB = BYTES_PER_KB * 1024;
export const BYTES_PER_GB = BYTES_PER_MB * 1024;
export const BYTES_PER_TB = BYTES_PER_GB * 1024;

// Common file size limits
export const MAX_FILE_SIZE_50MB = 50 * BYTES_PER_MB;
export const MAX_FILE_SIZE_100MB = 100 * BYTES_PER_MB;
export const MAX_FILE_SIZE_500MB = 500 * BYTES_PER_MB;
export const MAX_FILE_SIZE_1GB = BYTES_PER_GB;

