import { Organizations, Users, init } from "@kinde/management-api-js";
import { logger } from "./logger";

/**
 * Initialize Kinde Management API
 * Ensures Kinde SDK is initialized with proper credentials
 */
function initializeKindeApi(): void {
  const domain = process.env.KINDE_DOMAIN;
  const clientId = process.env.KINDE_MANAGEMENT_CLIENT_ID;
  const clientSecret = process.env.KINDE_MANAGEMENT_CLIENT_SECRET;

  if (!domain || !clientId || !clientSecret) {
    throw new Error(
      "Missing required Kinde environment variables: KINDE_DOMAIN, KINDE_MANAGEMENT_CLIENT_ID, KINDE_MANAGEMENT_CLIENT_SECRET"
    );
  }

  init({
    kindeDomain: domain,
    clientId,
    clientSecret,
  });

  logger.info("Successfully initialized Kinde Management API");
}

/**
 * Kinde Auth Service
 * Provides access to Kinde Management API for user and organization operations
 */
export class AuthService {
  private static initialized = false;

  private static ensureInitialized(): void {
    if (!this.initialized) {
      initializeKindeApi();
      this.initialized = true;
    }
  }

  static get Users() {
    this.ensureInitialized();
    return Users;
  }

  static get Organizations() {
    this.ensureInitialized();
    return Organizations;
  }
}

