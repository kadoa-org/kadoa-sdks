import type { KadoaUser } from "../internal/domains/user/user.service";
import type { UserService } from "../internal/domains/user/user.service";

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
	constructor(private readonly userService: UserService) {}

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
