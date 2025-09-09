import type { PagedResponse, PageInfo, PageOptions } from "./types";

/**
 * Simple async paginator for page-based pagination
 * @template T The type of items being paginated
 */
export class PagedIterator<T> {
	constructor(
		private readonly fetchPage: (
			options: PageOptions,
		) => Promise<PagedResponse<T>>,
	) {}

	/**
	 * Fetch all items across all pages
	 * @param options Base options (page will be overridden)
	 * @returns Array of all items
	 */
	async fetchAll(options: Omit<PageOptions, "page"> = {}): Promise<T[]> {
		const allItems: T[] = [];
		let currentPage = 1;
		let hasMore = true;

		while (hasMore) {
			const result = await this.fetchPage({ ...options, page: currentPage });
			allItems.push(...result.data);

			const pagination = result.pagination;
			hasMore =
				pagination.page !== undefined &&
				pagination.totalPages !== undefined &&
				pagination.page < pagination.totalPages;

			currentPage++;
		}

		return allItems;
	}

	/**
	 * Create an async iterator for pages
	 * @param options Base options (page will be overridden)
	 * @returns Async generator that yields pages
	 */
	async *pages(
		options: Omit<PageOptions, "page"> = {},
	): AsyncGenerator<PagedResponse<T>, void, unknown> {
		let currentPage = 1;
		let hasMore = true;

		while (hasMore) {
			const result = await this.fetchPage({ ...options, page: currentPage });
			yield result;

			const pagination = result.pagination;
			hasMore =
				pagination.page !== undefined &&
				pagination.totalPages !== undefined &&
				pagination.page < pagination.totalPages;

			currentPage++;
		}
	}

	/**
	 * Create an async iterator for individual items
	 * @param options Base options (page will be overridden)
	 * @returns Async generator that yields items
	 */
	async *items(
		options: Omit<PageOptions, "page"> = {},
	): AsyncGenerator<T, void, unknown> {
		for await (const page of this.pages(options)) {
			for (const item of page.data) {
				yield item;
			}
		}
	}
}
