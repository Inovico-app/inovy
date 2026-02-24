import https from "node:https";
import tls from "node:tls";
import fs from "node:fs";
import { logger } from "../logger";

interface HttpsAgentOptions {
  rejectUnauthorized?: boolean;
  ca?: string | Buffer | Array<string | Buffer>;
  minVersion?: tls.SecureVersion;
  maxVersion?: tls.SecureVersion;
}

class SecureHttpsAgentManager {
  private static instance: SecureHttpsAgentManager;
  private agent: https.Agent | null = null;
  private customCaCerts: string[] = [];

  private constructor() {
    this.initializeAgent();
  }

  static getInstance(): SecureHttpsAgentManager {
    if (!SecureHttpsAgentManager.instance) {
      SecureHttpsAgentManager.instance = new SecureHttpsAgentManager();
    }
    return SecureHttpsAgentManager.instance;
  }

  private initializeAgent(): void {
    try {
      this.loadCustomCaCertificates();

      const agentOptions: HttpsAgentOptions = {
        rejectUnauthorized: true,
        minVersion: "TLSv1.2",
        maxVersion: "TLSv1.3",
      };

      if (this.customCaCerts.length > 0) {
        const rootCAs = tls.rootCertificates.slice();
        agentOptions.ca = [...rootCAs, ...this.customCaCerts];

        logger.info("Initialized HTTPS agent with custom CA certificates", {
          component: "SecureHttpsAgentManager",
          customCaCount: this.customCaCerts.length,
          systemCaCount: rootCAs.length,
        });
      } else {
        logger.info("Initialized HTTPS agent with system CA certificates", {
          component: "SecureHttpsAgentManager",
          systemCaCount: tls.rootCertificates.length,
        });
      }

      this.agent = new https.Agent(agentOptions);
    } catch (error) {
      logger.error("Failed to initialize HTTPS agent", {
        component: "SecureHttpsAgentManager",
        error: error instanceof Error ? error.message : String(error),
      });

      this.agent = new https.Agent({
        rejectUnauthorized: true,
        minVersion: "TLSv1.2",
        maxVersion: "TLSv1.3",
      });
    }
  }

  private loadCustomCaCertificates(): void {
    const customCaPath = process.env.CA_CERTIFICATE_PATH;
    const customCaCert = process.env.CA_CERTIFICATE;

    if (customCaPath) {
      try {
        if (fs.existsSync(customCaPath)) {
          const certContent = fs.readFileSync(customCaPath, "utf-8");
          this.customCaCerts.push(certContent);

          logger.info("Loaded custom CA certificate from file", {
            component: "SecureHttpsAgentManager",
            path: customCaPath,
          });
        } else {
          logger.warn("Custom CA certificate file not found", {
            component: "SecureHttpsAgentManager",
            path: customCaPath,
          });
        }
      } catch (error) {
        logger.error("Failed to load custom CA certificate from file", {
          component: "SecureHttpsAgentManager",
          path: customCaPath,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    if (customCaCert) {
      try {
        this.customCaCerts.push(customCaCert);

        logger.info("Loaded custom CA certificate from environment variable", {
          component: "SecureHttpsAgentManager",
        });
      } catch (error) {
        logger.error(
          "Failed to load custom CA certificate from environment variable",
          {
            component: "SecureHttpsAgentManager",
            error: error instanceof Error ? error.message : String(error),
          }
        );
      }
    }
  }

  getAgent(): https.Agent {
    if (!this.agent) {
      this.initializeAgent();
    }

    return this.agent!;
  }

  validateConfiguration(): {
    rejectUnauthorized: boolean;
    tlsVersion: string;
    caCount: number;
    hasCustomCa: boolean;
  } {
    const agent = this.getAgent();
    const options = agent.options as HttpsAgentOptions;

    return {
      rejectUnauthorized: options.rejectUnauthorized ?? true,
      tlsVersion: `${options.minVersion} - ${options.maxVersion}`,
      caCount: tls.rootCertificates.length + this.customCaCerts.length,
      hasCustomCa: this.customCaCerts.length > 0,
    };
  }

  refreshAgent(): void {
    if (this.agent) {
      this.agent.destroy();
    }
    this.customCaCerts = [];
    this.initializeAgent();

    logger.info("HTTPS agent refreshed", {
      component: "SecureHttpsAgentManager",
    });
  }
}

export function getSecureHttpsAgent(): https.Agent {
  return SecureHttpsAgentManager.getInstance().getAgent();
}

export function validateHttpsConfiguration() {
  return SecureHttpsAgentManager.getInstance().validateConfiguration();
}

export function refreshHttpsAgent(): void {
  SecureHttpsAgentManager.getInstance().refreshAgent();
}
