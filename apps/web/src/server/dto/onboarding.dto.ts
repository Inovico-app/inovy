/**
 * Onboarding DTO
 * Data transfer object for onboarding records
 */

export interface OnboardingDto {
  id: string;
  userId: string | null;
  organizationId: string | null;
  signupType: "individual" | "organization";
  orgSize: number | null;
  referralSource: string | null;
  signupMethod: "email" | "google" | "microsoft" | "magic_link" | "passkey";
  onboardingCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateOnboardingDto {
  userId?: string;
  organizationId?: string;
  signupType: "individual" | "organization";
  orgSize?: number;
  referralSource?: string;
  signupMethod: "email" | "google" | "microsoft" | "magic_link" | "passkey";
}

export interface OnboardingStatsDto {
  totalSignups: number;
  individualSignups: number;
  organizationSignups: number;
  signupMethods: Record<string, number>;
  referralSources: Record<string, number>;
  averageOrgSize: number;
}

