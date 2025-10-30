import { Organizations, Users, init } from "@kinde/management-api-js";
import { Result, err, ok } from "neverthrow";
import { logger } from "./logger";

/**
 * Kinde Management API Client
 * Provides authenticated access to Kinde's Management API for user and organization operations
 */

interface KindeConfig {
  domain: string;
  clientId: string;
  clientSecret: string;
  audience: string;
}

class KindeApiClient {
  private config: KindeConfig;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;
  private isInitialized: boolean = false;

  constructor() {
    const domain = process.env.KINDE_DOMAIN;
    const clientId = process.env.KINDE_M2M_CLIENT_ID;
    const clientSecret = process.env.KINDE_M2M_CLIENT_SECRET;

    if (!domain || !clientId || !clientSecret) {
      throw new Error(
        "Missing required Kinde environment variables: KINDE_DOMAIN, KINDE_M2M_CLIENT_ID, KINDE_M2M_CLIENT_SECRET"
      );
    }

    this.config = {
      domain,
      clientId,
      clientSecret,
      audience: `${domain}/api`,
    };
  }

  /**
   * Get or refresh access token
   */
  private async getAccessToken(): Promise<Result<string, string>> {
    try {
      // Return cached token if still valid (with 5 minute buffer)
      const now = Date.now();
      if (this.accessToken && this.tokenExpiry > now + 5 * 60 * 1000) {
        return ok(this.accessToken);
      }

      // Request new token
      const tokenUrl = `${this.config.domain}/oauth2/token`;
      const response = await fetch(tokenUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          audience: this.config.audience,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error("Failed to get Kinde access token", {
          status: response.status,
          error: errorText,
        });
        return err(`Failed to get access token: ${response.status}`);
      }

      const data = await response.json();
      this.accessToken = data.access_token;
      // expires_in is in seconds, convert to milliseconds
      this.tokenExpiry = now + data.expires_in * 1000;

      if (!this.accessToken) {
        return err("Failed to get access token - no access token returned");
      }

      logger.info("Successfully obtained Kinde access token");
      return ok(this.accessToken);
    } catch (error) {
      const errorMessage = "Error obtaining Kinde access token";
      logger.error(errorMessage, error as Error);
      return err(errorMessage);
    }
  }

  /**
   * Initialize the Kinde Management API
   */
  private async initializeApi(): Promise<Result<boolean, string>> {
    if (this.isInitialized) {
      return ok(true);
    }

    try {
      const tokenResult = await this.getAccessToken();
      if (tokenResult.isErr()) {
        return err(tokenResult.error);
      }

      // Initialize the Kinde Management API with authentication
      init({
        kindeDomain: this.config.domain,
        clientId: this.config.clientId,
        clientSecret: this.config.clientSecret,
      });

      this.isInitialized = true;
      logger.info("Successfully initialized Kinde Management API");
      return ok(true);
    } catch (error) {
      const errorMessage = "Failed to initialize Kinde Management API";
      logger.error(errorMessage, error as Error);
      return err(errorMessage);
    }
  }

  /**
   * Get authenticated Users API (static methods)
   */
  async getUsersApi(): Promise<Result<typeof Users, string>> {
    const initResult = await this.initializeApi();
    if (initResult.isErr()) {
      return err(initResult.error);
    }
    return ok(Users);
  }

  /**
   * Get authenticated Organizations API (static methods)
   */
  async getOrganizationsApi(): Promise<Result<typeof Organizations, string>> {
    const initResult = await this.initializeApi();
    if (initResult.isErr()) {
      return err(initResult.error);
    }
    return ok(Organizations);
  }

  /**
   * Test the connection to Kinde API
   */
  async testConnection(): Promise<Result<boolean, string>> {
    const tokenResult = await this.getAccessToken();
    if (tokenResult.isErr()) {
      return err(tokenResult.error);
    }
    return ok(true);
  }
}

// Singleton instance
let kindeApiClientInstance: KindeApiClient | null = null;

/**
 * Get the Kinde API client instance
 */
export function getKindeApiClient(): KindeApiClient {
  if (!kindeApiClientInstance) {
    kindeApiClientInstance = new KindeApiClient();
  }
  return kindeApiClientInstance;
}

export type { KindeApiClient };

