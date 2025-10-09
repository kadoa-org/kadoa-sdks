/**
 * Simple page-based pagination info
 * Maps directly to the most common API pagination format
 */
export interface PageInfo {
  /** Total number of items */
  totalCount?: number;
  /** Current page number */
  page?: number;
  /** Total number of pages */
  totalPages?: number;
  /** Number of items per page */
  limit?: number;
}

/**
 * Paginated response with data and pagination info
 * @template T The type of items in the data array
 */
export interface PagedResponse<T> {
  /** Array of items for the current page */
  data: T[];
  /** Pagination metadata */
  pagination: PageInfo;
}

/**
 * Options for paginated requests
 */
export interface PageOptions {
  /** Page number (1-indexed) */
  page?: number;
  /** Number of items per page */
  limit?: number;
}
