/**
 * Smart Next-safe-action server action client using neverthrow Result types
 * This approach eliminates custom error classes in favor of functional error handling
 */

import { type Result, err, ok } from "neverthrow";
import {
  createSafeActionClient,
  type MiddlewareResult,
} from "next-safe-action";
import { z } from "zod";

import { ActionErrors, type ActionError } from "./action-errors";
import { getAuthSession, type AuthUser } from "./auth";
import { generateApplicationErrorMessage } from "./error-messages";
import { logger } from "./logger";
import { POLICY_KEYS, userIsAuthorized, type SessionWithRoles } from "./rbac";

/**
 * Metadata schema for actions
 */
const schemaMetadata = z.object({
  policy: z.enum(POLICY_KEYS),
  skipAuth: z.boolean().optional(),
});

export type Metadata = z.infer<typeof schemaMetadata>;

/**
 * Context passed through middleware chain
 */
export interface ActionContext {
  logger: typeof logger;
  session?: SessionWithRoles;
  user?: AuthUser;
}

/**
 * Result type for action operations
 */
export type ActionResult<T> = Result<T, ActionError>;

/**
 * Creates an authorized action client with Result-based error handling
 */
export const authorizedActionClient = createSafeActionClient({
  handleServerError: handleActionError,
  defineMetadataSchema: () => schemaMetadata,
})
  .use(actionLoggerMiddleware)
  .use(authenticationMiddleware);

/**
 * Creates a public action client without authentication
 */
export const publicActionClient = createSafeActionClient({
  handleServerError: handleActionError,
}).use(publicActionLoggerMiddleware);

/**
 * Middleware for logging action execution
 */
async function actionLoggerMiddleware({
  next,
  metadata,
}: {
  metadata: Metadata;
  next: <NC extends object>(opts: {
    ctx: NC;
  }) => Promise<MiddlewareResult<string, NC>>;
}) {
  const { policy } = metadata;

  logger.info(`Executing server action: ${policy}`, {
    action: policy,
    component: "server-action",
  });

  return next({ ctx: { logger } });
}

/**
 * Middleware for logging public actions
 */
async function publicActionLoggerMiddleware({
  next,
}: {
  next: <NC extends object>(opts: {
    ctx: NC;
  }) => Promise<MiddlewareResult<string, NC>>;
}) {
  logger.info("Executing public server action", {
    component: "server-action",
    type: "public",
  });

  return next({ ctx: { logger } });
}

/**
 * Authentication and authorization middleware using Result types
 */
async function authenticationMiddleware({
  next,
  ctx,
  metadata: { policy, skipAuth },
}: {
  next: <NC extends object>(opts: {
    ctx: NC;
  }) => Promise<MiddlewareResult<string, NC>>;
  ctx: ActionContext;
  metadata: Metadata;
}) {
  if (skipAuth) {
    return next({ ctx });
  }

  const authResult = await getAuthSession();

  if (authResult.isErr()) {
    ctx.logger.error("Authentication error in middleware", {
      component: "auth-middleware",
      error: authResult.error,
      policy,
    });

    // Convert to ActionError and throw
    const actionError = ActionErrors.internal(
      "Authentication system error",
      new Error(authResult.error),
      "auth-middleware"
    );
    throw createErrorForNextSafeAction(actionError);
  }

  const { isAuthenticated, user } = authResult.value;

  if (!isAuthenticated || !user) {
    const actionError = ActionErrors.unauthenticated(
      "User is not authenticated",
      "auth-middleware"
    );
    throw createErrorForNextSafeAction(actionError);
  }

  // Create session compatible with RBAC
  const session: SessionWithRoles = {
    user,
    // Add access token if available from your auth system
  };

  // Check authorization
  const { isAuthorized, requiredRoles } = userIsAuthorized(session, policy);

  if (!isAuthorized) {
    ctx.logger.error("User not authorized for action", {
      userId: session.user.id,
      policy,
      requiredRoles,
      component: "auth-middleware",
    });

    const actionError = ActionErrors.forbidden(
      "User is not authorized to perform this action",
      {
        userId: session.user.id,
        "required-roles": requiredRoles,
        policy,
      },
      "auth-middleware"
    );
    throw createErrorForNextSafeAction(actionError);
  }

  logger.info("User authenticated and authorized", {
    userId: user.id,
    policy,
    component: "auth-middleware",
  });

  return next({
    ctx: {
      ...ctx,
      session,
      user,
    },
  });
}

/**
 * Convert ActionError to Error for next-safe-action compatibility
 */
function createErrorForNextSafeAction(actionError: ActionError): Error & { actionError: ActionError } {
  const error = new Error(actionError.message) as Error & { actionError: ActionError };
  error.name = "ActionError";
  // Attach the ActionError data to the Error object
  error.actionError = actionError;
  return error;
}

/**
 * Smart error handler that works with Result types
 */
function handleActionError(error: unknown): string {
  // Check if it's our ActionError wrapped in an Error
  if (error instanceof Error && 'actionError' in error) {
    const actionError = (error as Error & { actionError: ActionError }).actionError;

    logger.error("Action error occurred", {
      code: actionError.code,
      message: actionError.message,
      context: actionError.context,
      metadata: actionError.metadata,
      cause:
        actionError.cause instanceof Error
          ? actionError.cause.message
          : actionError.cause,
      component: "action-error-handler",
    });

    return generateApplicationErrorMessage(actionError.code);
  }

  // Handle unexpected errors
  logger.error("Unexpected server action error", {
    error: error instanceof Error ? error.message : String(error),
    component: "action-error-handler",
  });

  return generateApplicationErrorMessage("INTERNAL_SERVER_ERROR");
}

/**
 * Smart async wrapper that returns Result types
 */
export async function safeAsync<T>(
  operation: () => Promise<T>,
  context?: string
): Promise<ActionResult<T>> {
  try {
    const result = await operation();
    return ok(result);
  } catch (error) {
    const actionError = ActionErrors.internal(
      error instanceof Error ? error.message : "Unknown error",
      error,
      context
    );
    return err(actionError);
  }
}

/**
 * Safe sync operation wrapper
 */
export function safeSync<T>(
  operation: () => T,
  context?: string
): ActionResult<T> {
  try {
    const result = operation();
    return ok(result);
  } catch (error) {
    const actionError = ActionErrors.internal(
      error instanceof Error ? error.message : "Unknown error",
      error,
      context
    );
    return err(actionError);
  }
}

/**
 * Chain multiple Result operations together
 */
export function chainResults<T, U>(
  result: ActionResult<T>,
  fn: (value: T) => ActionResult<U>
): ActionResult<U> {
  return result.andThen(fn);
}

/**
 * Map over a Result value
 */
export function mapResult<T, U>(
  result: ActionResult<T>,
  fn: (value: T) => U
): ActionResult<U> {
  return result.map(fn);
}

/**
 * Combine multiple Results - all must succeed
 */
export function combineResults<T extends readonly unknown[]>(
  ...results: { [K in keyof T]: ActionResult<T[K]> }
): ActionResult<T> {
  for (const result of results) {
    if (result.isErr()) {
      return result as ActionResult<never>;
    }
  }

  return ok(results.map((r) => {
    if (r.isOk()) {
      return r.value;
    }
    throw new Error('Unexpected error state');
  }) as unknown as T);
}

/**
 * Validation helper using Zod with Result types
 */
export function validateInput<T>(
  schema: z.ZodSchema<T>,
  input: unknown,
  _context?: string
): ActionResult<T> {
  const result = schema.safeParse(input);

  if (!result.success) {
    const firstError = result.error.issues[0];
    return err(
      ActionErrors.validation(firstError.message, {
        field: firstError.path.join("."),
        input,
      })
    );
  }

  return ok(result.data);
}

/**
 * Helper to convert Result to next-safe-action compatible format
 */
export function resultToActionResponse<T>(result: ActionResult<T>): T {
  if (result.isErr()) {
    throw createErrorForNextSafeAction(result.error);
  }
  return result.value;
}

