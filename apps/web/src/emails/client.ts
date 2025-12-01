/**
 * Email service using Resend
 * Handles all email sending functionality for the application
 */

import { logger } from "@/lib/logger";
import { Resend } from "resend";
const { render } = await import("@react-email/render");

// Lazy initialization of Resend client
// Only create the client when actually needed and API key is available
let resendInstance: Resend | null = null;

function getResendClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    return null;
  }
  resendInstance ??= new Resend(process.env.RESEND_API_KEY);
  return resendInstance;
}

// Default from email address
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "Inovy <app@inovico.nl>";

// Default reply-to email address
const REPLY_TO_EMAIL = process.env.RESEND_REPLY_TO_EMAIL ?? FROM_EMAIL;

/**
 * Email sending result
 */
export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Base email options
 */
interface BaseEmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

/**
 * Send an email using Resend
 */
export async function sendEmail(
  options: BaseEmailOptions
): Promise<EmailResult> {
  const resend = getResendClient();
  if (!resend) {
    logger.warn("RESEND_API_KEY not configured, skipping email send", {
      component: "email",
      action: "sendEmail",
      to: Array.isArray(options.to) ? options.to.join(", ") : options.to,
      subject: options.subject,
    });
    return {
      success: false,
      error: "RESEND_API_KEY not configured",
    };
  }

  try {
    const recipients = Array.isArray(options.to) ? options.to : [options.to];

    if (!options.html) {
      return {
        success: false,
        error: "HTML content is required",
      };
    }

    const result = await resend.emails.send({
      from: options.from ?? FROM_EMAIL,
      to: recipients,
      replyTo: options.replyTo ?? REPLY_TO_EMAIL,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    if (result.error) {
      logger.error("Failed to send email", {
        component: "email",
        action: "sendEmail",
        error: result.error,
        to: recipients.join(", "),
        subject: options.subject,
      });
      return {
        success: false,
        error: result.error.message || "Unknown error",
      };
    }

    logger.info("Email sent successfully", {
      component: "email",
      action: "sendEmail",
      messageId: result.data?.id,
      to: recipients.join(", "),
      subject: options.subject,
    });

    return {
      success: true,
      messageId: result.data?.id,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    logger.error("Exception while sending email", {
      component: "email",
      action: "sendEmail",
      error: errorMessage,
      to: Array.isArray(options.to) ? options.to.join(", ") : options.to,
      subject: options.subject,
    });
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Send an email using a React Email template
 */
export async function sendEmailFromTemplate(
  options: BaseEmailOptions & {
    react: React.ReactElement;
  }
): Promise<EmailResult> {
  try {
    const html = await render(options.react);
    const text = await render(options.react, { plainText: true });

    return sendEmail({
      ...options,
      html,
      text,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    logger.error("Failed to render email template", {
      component: "email",
      action: "sendEmailFromTemplate",
      error: errorMessage,
      to: Array.isArray(options.to) ? options.to.join(", ") : options.to,
      subject: options.subject,
    });
    return {
      success: false,
      error: `Template rendering failed: ${errorMessage}`,
    };
  }
}

