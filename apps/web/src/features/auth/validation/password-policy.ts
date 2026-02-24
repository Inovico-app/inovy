import type { PasswordPolicyRequirements } from "@/lib/auth/mfa-utils";
import { PasswordValidator } from "@/lib/auth/mfa-utils";
import type { organizationAuthPolicies } from "@/server/db/schema";
import { z } from "zod";

export function createPasswordSchema(
  policy: typeof organizationAuthPolicies.$inferSelect | null
): z.ZodString {
  const minLength = policy?.passwordMinLength ?? 8;

  let schema = z
    .string()
    .min(minLength, `Password must be at least ${minLength} characters`);

  if (policy?.passwordRequireUppercase) {
    schema = schema.regex(
      /[A-Z]/,
      "Password must contain at least one uppercase letter"
    );
  }

  if (policy?.passwordRequireLowercase) {
    schema = schema.regex(
      /[a-z]/,
      "Password must contain at least one lowercase letter"
    );
  }

  if (policy?.passwordRequireNumbers) {
    schema = schema.regex(/\d/, "Password must contain at least one number");
  }

  if (policy?.passwordRequireSpecialChars) {
    schema = schema.regex(
      /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/,
      "Password must contain at least one special character"
    );
  }

  return schema;
}

export function validatePasswordAgainstPolicy(
  password: string,
  policy: typeof organizationAuthPolicies.$inferSelect | null
): { valid: boolean; errors: string[] } {
  const requirements: PasswordPolicyRequirements = {
    minLength: policy?.passwordMinLength ?? 8,
    requireUppercase: policy?.passwordRequireUppercase ?? false,
    requireLowercase: policy?.passwordRequireLowercase ?? false,
    requireNumbers: policy?.passwordRequireNumbers ?? false,
    requireSpecialChars: policy?.passwordRequireSpecialChars ?? false,
  };

  return PasswordValidator.validate(password, requirements);
}

export function getPasswordPolicyDescription(
  policy: typeof organizationAuthPolicies.$inferSelect | null
): string {
  const requirements: string[] = [];

  const minLength = policy?.passwordMinLength ?? 8;
  requirements.push(`at least ${minLength} characters`);

  if (policy?.passwordRequireUppercase) {
    requirements.push("one uppercase letter");
  }

  if (policy?.passwordRequireLowercase) {
    requirements.push("one lowercase letter");
  }

  if (policy?.passwordRequireNumbers) {
    requirements.push("one number");
  }

  if (policy?.passwordRequireSpecialChars) {
    requirements.push("one special character");
  }

  return `Password must contain ${requirements.join(", ")}.`;
}
