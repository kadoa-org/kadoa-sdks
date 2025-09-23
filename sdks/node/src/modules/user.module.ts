import type { KadoaUser } from "../internal/domains/user/user.service";
import { UserService } from "../internal/domains/user/user.service";
import type { KadoaClient } from "../kadoa-client";

/**
 * UserModule provides user management functionality
 *
 * @example
 * ```typescript
 * import { KadoaClient } from '@kadoa/sdk';
 *
 * const client = new KadoaClient({
 *   apiKey: 'your-api-key'
 * });
 *
 * // Get current user details
 * const currentUser = await client.user.getCurrentUser();
 * ```
 */
export class UserModule {
	private readonly userService: UserService;

	constructor(client: KadoaClient) {
		this.userService = new UserService(client);
	}

	/**
	 * Get the underlying UserService instance
	 * @returns UserService instance
	 */
	get service(): UserService {
		return this.userService;
	}

	/**
	 * Get current user details
	 * @returns KadoaUser details
	 */
	async getCurrentUser(): Promise<KadoaUser> {
		return this.userService.getCurrentUser();
	}
}
