"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { updateProfile } from "@/features/settings/actions/update-profile";
import { toast } from "sonner";

function EditProfileContent() {
  const router = useRouter();
  const [givenName, setGivenName] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load initial values from localStorage or user data
  useEffect(() => {
    const stored = localStorage.getItem("user_profile");
    if (stored) {
      const profile = JSON.parse(stored);
      setGivenName(profile.given_name || "");
      setFamilyName(profile.family_name || "");
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setIsLoading(true);

    try {
      const result = await updateProfile({
        given_name: givenName,
        family_name: familyName,
      });

      if (result.success) {
        toast.success("Profile updated successfully!");
        // Save to localStorage for immediate UI update
        localStorage.setItem(
          "user_profile",
          JSON.stringify({ given_name: givenName, family_name: familyName })
        );
        // Use a small delay to ensure UI updates
        setTimeout(() => {
          router.push("/settings/profile");
        }, 500);
      } else {
        setErrors({ submit: result.error || "Failed to update profile" });
        toast.error(result.error || "Failed to update profile");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "An error occurred";
      setErrors({ submit: message });
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto max-w-2xl py-8 px-4">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Edit Profile</h1>
          <p className="text-muted-foreground">
            Update your personal information
          </p>
        </div>

        {/* Edit Form */}
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>
              Update your name and personal details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* First Name */}
              <div className="space-y-2">
                <Label htmlFor="given_name">First Name</Label>
                <Input
                  id="given_name"
                  type="text"
                  value={givenName}
                  onChange={(e) => setGivenName(e.target.value)}
                  placeholder="Enter your first name"
                  disabled={isLoading}
                  className={errors.given_name ? "border-red-500" : ""}
                />
                {errors.given_name && (
                  <p className="text-sm text-red-500">{errors.given_name}</p>
                )}
              </div>

              {/* Last Name */}
              <div className="space-y-2">
                <Label htmlFor="family_name">Last Name</Label>
                <Input
                  id="family_name"
                  type="text"
                  value={familyName}
                  onChange={(e) => setFamilyName(e.target.value)}
                  placeholder="Enter your last name"
                  disabled={isLoading}
                  className={errors.family_name ? "border-red-500" : ""}
                />
                {errors.family_name && (
                  <p className="text-sm text-red-500">{errors.family_name}</p>
                )}
              </div>

              {/* Submit Error */}
              {errors.submit && (
                <div className="bg-red-50 border border-red-200 rounded p-3">
                  <p className="text-sm text-red-700">{errors.submit}</p>
                </div>
              )}

              {/* Form Actions */}
              <div className="flex gap-3 pt-4">
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Saving..." : "Save Changes"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isLoading}
                  asChild
                >
                  <Link href="/settings/profile">Cancel</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Additional Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Note</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              • Email changes require verification and should be done through your account settings
            </p>
            <p>
              • Password changes can be managed through your Kinde account dashboard
            </p>
            <p>
              • Changes are saved immediately after confirmation
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function EditProfilePage() {
  return <EditProfileContent />;
}
