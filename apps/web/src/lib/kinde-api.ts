import { Organizations, Users, init } from "@kinde/management-api-js";
import { logger } from "./logger";

/**
 * Kinde Auth Service
 * Provides access to Kinde Management API for user and organization operations
 */
export class AuthService {
  private static initPromise: Promise<void> | null = null;

  private static async ensureInitialized(): Promise<void> {
    this.initPromise ??= (async () => {
      const domain = process.env.KINDE_DOMAIN;
      const clientId = process.env.KINDE_MANAGEMENT_CLIENT_ID;
      const clientSecret = process.env.KINDE_MANAGEMENT_CLIENT_SECRET;

      if (!domain || !clientId || !clientSecret) {
        throw new Error(
          "Missing required Kinde environment variables: KINDE_DOMAIN, KINDE_MANAGEMENT_CLIENT_ID, KINDE_MANAGEMENT_CLIENT_SECRET"
        );
      }

      await init({
        kindeDomain: domain,
        clientId,
        clientSecret,
      });

      logger.info("Successfully initialized Kinde Management API");
    })();

    return this.initPromise;
  }

  static async getUsers() {
    await this.ensureInitialized();
    return Users;
  }

  static async getOrganizations() {
    await this.ensureInitialized();
    return Organizations;
  }
}

