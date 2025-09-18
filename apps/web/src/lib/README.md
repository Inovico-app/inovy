# Smart Server Action Client

A revolutionary approach to server actions using `neverthrow` Result types throughout, eliminating the need for custom error classes and providing a purely functional error handling experience.

## 🌟 Why This Approach is Better

### Traditional Approach Problems:

- ❌ Custom error classes create complexity
- ❌ Try-catch blocks everywhere
- ❌ Inconsistent error handling patterns
- ❌ Hard to compose operations
- ❌ Error information gets lost in translation

### Smart Result-Based Approach Benefits:

- ✅ **Functional**: Pure functions with explicit error handling
- ✅ **Composable**: Chain operations with `chainResults`, `mapResult`
- ✅ **Type-Safe**: Full TypeScript inference for success and error cases
- ✅ **Consistent**: Same error handling pattern everywhere
- ✅ **Explicit**: Errors are part of the return type, not exceptions
- ✅ **Testable**: Easy to test both success and failure paths

## Quick Start

### 1. Smart Authorized Action

```typescript
import {
  authorizedActionClient,
  resultToActionResponse,
  safeAsync,
} from "@/lib";
import { ActionErrors } from "@/lib/action-errors";
import { z } from "zod";

const updateUserSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
});

export const updateUserAction = authorizedActionClient
  .metadata({ policy: "users:update" })
  .schema(updateUserSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { id, name } = parsedInput;
    const { logger } = ctx;

    // All operations return Results - no exceptions
    const result = await updateUserWithResults(id, name, logger);

    // Convert Result to action response (throws only if error)
    return resultToActionResponse(result);
  });

// Pure business logic using Results
async function updateUserWithResults(
  id: string,
  name: string,
  logger: Logger
): Promise<ActionResult<{ success: boolean; user: User }>> {
  // Safe database operation
  const updateResult = await safeAsync(
    () => updateUserInDatabase(id, name),
    "user-update"
  );

  if (updateResult.isErr()) {
    return err(
      ActionErrors.internal(
        "Failed to update user",
        updateResult.error.cause,
        "user-update"
      )
    );
  }

  logger.info("User updated successfully", { userId: id });

  return ok({
    success: true,
    user: updateResult.value,
  });
}
```

### 2. Functional Composition

```typescript
import { chainResults, mapResult, combineResults, validateInput } from "@/lib";

export async function createProjectWithValidation(
  input: unknown
): Promise<ActionResult<{ projectId: string; warnings?: string[] }>> {
  // Step 1: Validate input
  const inputResult = validateInput(createProjectSchema, input);
  if (inputResult.isErr()) return inputResult;

  // Step 2: Combine multiple async operations
  const combinedResult = await combineResults(
    await checkUserPermissions(),
    await validateProjectName(inputResult.value.name),
    await getOrganizationLimits()
  );

  if (combinedResult.isErr()) return combinedResult;

  const [hasPermission, isNameValid, limits] = combinedResult.value;

  // Step 3: Chain operations
  return chainResults(
    await createProjectInDatabase(inputResult.value),
    (project) =>
      mapResult(ok(project), (p) => ({
        projectId: p.id,
        warnings: limits.isNearLimit
          ? ["Approaching project limit"]
          : undefined,
      }))
  );
}
```

### 3. Error Handling Patterns

```typescript
import { handleResult, ActionErrors } from "@/lib";

// Pattern 1: Handle with callbacks
const result = await someOperation();
return handleResult(result, {
  onSuccess: (data) => ({ success: true, data }),
  onError: (error) => ({ success: false, message: error.message }),
});

// Pattern 2: Early return on error
const userResult = await getUser(id);
if (userResult.isErr()) {
  return err(ActionErrors.notFound("User", "user-lookup"));
}

const user = userResult.value;

// Pattern 3: Chain multiple operations
return chainResults(await validateUser(id), (user) =>
  chainResults(await checkPermissions(user), () =>
    updateUserData(user, newData)
  )
);
```

## Core Utilities

### Result Creators

```typescript
import { ActionErrors } from "@/lib/action-errors";

// Pre-built error creators
ActionErrors.unauthenticated();
ActionErrors.forbidden("Custom message", { userId: "123" });
ActionErrors.notFound("Project");
ActionErrors.badRequest("Invalid input");
ActionErrors.validation("Name is required", { field: "name" });
ActionErrors.internal("Database error", originalError);
ActionErrors.rateLimited();
ActionErrors.serviceUnavailable();

// Custom error
createActionError("BAD_REQUEST", "Custom error", {
  metadata: { field: "email" },
  context: "email-validation",
});
```

### Safe Operations

```typescript
// Safe async operations
const result = await safeAsync(
  () => fetch("/api/data").then((r) => r.json()),
  "api-call"
);

// Safe sync operations
const parseResult = safeSync(() => JSON.parse(jsonString), "json-parsing");

// Input validation
const inputResult = validateInput(schema, userInput, "user-input");
```

### Result Combinators

```typescript
// Chain operations (flatMap)
const result = chainResults(await getUser(id), (user) =>
  updateUser(user, data)
);

// Transform success value (map)
const transformed = mapResult(userResult, (user) => ({
  ...user,
  displayName: `${user.firstName} ${user.lastName}`,
}));

// Combine multiple Results
const combined = combineResults(
  validateName(input.name),
  validateEmail(input.email),
  validateAge(input.age)
);
```

## Comparison: Before vs After

### Before (Custom Error Classes)

```typescript
export async function createProject(input: CreateProjectInput) {
  try {
    const validation = schema.parse(input);

    const session = await getAuthSession();
    if (!session) {
      throw new ServerActionError("Not authenticated", {
        code: "UNAUTHENTICATED",
      });
    }

    const user = await syncUser(session.user);
    if (!user) {
      throw new ServerActionError("User sync failed", {
        code: "INTERNAL_SERVER_ERROR",
      });
    }

    return await db.project.create(validation);
  } catch (error) {
    if (error instanceof ServerActionError) {
      throw error;
    }
    throw new ServerActionError("Unknown error", {
      code: "INTERNAL_SERVER_ERROR",
      cause: error,
    });
  }
}
```

### After (Smart Result Types)

```typescript
export async function createProject(
  input: CreateProjectInput
): Promise<ActionResult<Project>> {
  const inputResult = validateInput(createProjectSchema, input);
  if (inputResult.isErr()) return inputResult;

  return chainResults(await getAuthenticatedUser(), (user) =>
    chainResults(await safeAsync(() => syncUser(user), "user-sync"), (dbUser) =>
      safeAsync(
        () => db.project.create({ ...inputResult.value, userId: dbUser.id }),
        "project-creation"
      )
    )
  );
}
```

## Advanced Patterns

### 1. Pipeline Processing

```typescript
const processUserData = async (input: unknown) => {
  return await chainResults(validateInput(userSchema, input), (data) =>
    chainResults(await enrichUserData(data), (enriched) =>
      chainResults(await validateBusinessRules(enriched), (validated) =>
        saveUser(validated)
      )
    )
  );
};
```

### 2. Parallel Operations with Error Accumulation

```typescript
const validateAllFields = async (input: FormData) => {
  const results = await Promise.all([
    validateName(input.name),
    validateEmail(input.email),
    validatePhone(input.phone),
  ]);

  // Collect all errors
  const errors = results.filter((r) => r.isErr()).map((r) => r.error);
  if (errors.length > 0) {
    return err(
      ActionErrors.validation("Multiple validation errors", {
        errors: errors.map((e) => e.message),
      })
    );
  }

  return ok(results.map((r) => r.value));
};
```

### 3. Conditional Logic

```typescript
const processOrder = async (order: Order) => {
  return chainResults(await validateOrder(order), (validOrder) =>
    validOrder.amount > 1000
      ? chainResults(await requireManagerApproval(validOrder), () =>
          processLargeOrder(validOrder)
        )
      : processStandardOrder(validOrder)
  );
};
```

## Best Practices

1. **Always return Results** from business logic functions
2. **Use chainResults** for sequential operations that depend on each other
3. **Use combineResults** for parallel operations that all must succeed
4. **Use mapResult** to transform success values
5. **Use handleResult** for final result processing
6. **Provide context** in error messages for better debugging
7. **Keep business logic pure** - no side effects in Result-returning functions
8. **Use ActionErrors helpers** for consistent error creation
9. **Test both success and error paths** easily with Result types

## Migration Guide

1. **Replace try-catch** with `safeAsync` and `safeSync`
2. **Replace custom errors** with `ActionErrors` helpers
3. **Chain operations** with `chainResults` instead of nested try-catch
4. **Use `resultToActionResponse`** in action handlers
5. **Return Results** from all business logic functions
6. **Test with** both `.isOk()` and `.isErr()` branches

This approach provides a much cleaner, more maintainable, and more testable codebase while eliminating the complexity of custom error classes!

