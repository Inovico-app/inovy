import { ProtectedPage } from "@/components/protected-page";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AuthPolicyForm } from "@/features/settings/components/auth-policy-form";
import { MfaSettings } from "@/features/settings/components/mfa-settings";
import { Suspense } from "react";

export default async function SecuritySettingsPage() {
  return (
    <ProtectedPage>
      <div className="container mx-auto max-w-4xl py-12 px-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Security Settings</h1>
          <p className="text-muted-foreground mt-2">
            Configure authentication requirements and security policies for your
            organization
          </p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Two-Factor Authentication (MFA)</CardTitle>
              <CardDescription>
                Add an extra layer of security to your account by requiring a
                verification code in addition to your password
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<div>Loading MFA settings...</div>}>
                <MfaSettings />
              </Suspense>
            </CardContent>
          </Card>

          <Separator className="my-8" />

          <Card>
            <CardHeader>
              <CardTitle>Organization Authentication Policy</CardTitle>
              <CardDescription>
                Configure authentication requirements for all members of your
                organization. These policies ensure compliance with your security
                standards.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense
                fallback={<div>Loading authentication policy settings...</div>}
              >
                <AuthPolicyForm />
              </Suspense>
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedPage>
  );
}
