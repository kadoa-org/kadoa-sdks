import type { KadoaClient } from "../../kadoa-client";
import { KadoaSdkException } from "../../runtime/exceptions";
import type { KadoaFeatures } from "./user.acl";

export interface KadoaUser {
  userId: string;
  email: string;
  featureFlags: string[];
}

export class UserService {
  constructor(private readonly client: KadoaClient) {}

  /** Get customer-facing capabilities enabled for the active team. */
  async getFeatures(): Promise<KadoaFeatures> {
    const response = await this.client.apis.me.v4MeFeaturesGet();
    const features = response.data?.features;

    if (!features || typeof features.scrape !== "boolean") {
      throw new KadoaSdkException("Invalid capabilities data received");
    }

    return response.data;
  }

  /** Get current user details. */
  async getCurrentUser(): Promise<KadoaUser> {
    const response = await this.client.axiosInstance.get("/v5/user", {
      baseURL: this.client.baseUrl,
      headers: {
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
