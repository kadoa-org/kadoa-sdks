import type { KadoaClient } from "../../kadoa-client";
import { KadoaSdkException } from "../../runtime/exceptions";

export interface KadoaUser {
  userId: string;
  email: string;
  featureFlags: string[];
}

export class UserService {
  constructor(private readonly client: KadoaClient) {}

  /**
   * Get current user details
   * @returns User details
   */
  async getCurrentUser(): Promise<KadoaUser> {
    const response = await this.client.axiosInstance.get("/v5/user", {
      baseURL: this.client.baseUrl,
      headers: {
        "x-api-key": this.client.apiKey,
        "Content-Type": "application/json",
      },
    });

    const userData = response.data;

    if (!userData || !userData.userId) {
      throw new KadoaSdkException("Invalid user data received");
    }

    return {
      userId: userData.userId,
      email: userData.email,
      featureFlags: userData.featureFlags || [],
    };
  }
}
