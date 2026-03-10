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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { updateProfile } from "@/features/settings/actions/update-profile";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import {
  profileFormSchema,
  type ProfileFormValues,
} from "@/features/settings/validation/profile.schema";
import { useAction } from "next-safe-action/hooks";

function EditProfileContent() {
  const router = useRouter();

  const form = useForm<ProfileFormValues>({
    resolver: standardSchemaResolver(profileFormSchema),
    defaultValues: {
      givenName: "",
      familyName: "",
    },
  });

  const { execute, isExecuting } = useAction(updateProfile, {
    onSuccess: () => {
      const values = form.getValues();
      toast.success("Profile updated successfully!");
      localStorage.setItem(
        "user_profile",
        JSON.stringify({
          given_name: values.givenName,
          family_name: values.familyName,
        })
      );
      setTimeout(() => {
        router.push("/settings/profile");
      }, 500);
    },
    onError: ({ error }) => {
      const message = error.serverError || "Failed to update profile";
      form.setError("root", { message });
      toast.error(message);
    },
  });

  // Load initial values from localStorage or user data
  useEffect(() => {
    const stored = localStorage.getItem("user_profile");
    if (stored) {
      const profile = JSON.parse(stored);
      form.reset({
        givenName: profile.given_name || "",
        familyName: profile.family_name || "",
      });
    }
  }, [form]);

  function onSubmit(values: ProfileFormValues) {
    execute({
      given_name: values.givenName ?? "",
      family_name: values.familyName ?? "",
    });
  }

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
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                {/* First Name */}
                <FormField
                  control={form.control}
                  name="givenName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Enter your first name"
                          disabled={isExecuting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Last Name */}
                <FormField
                  control={form.control}
                  name="familyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Enter your last name"
                          disabled={isExecuting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Submit Error */}
                {form.formState.errors.root && (
                  <div className="bg-red-50 border border-red-200 rounded p-3">
                    <p className="text-sm text-red-700">
                      {form.formState.errors.root.message}
                    </p>
                  </div>
                )}

                {/* Form Actions */}
                <div className="flex gap-3 pt-4">
                  <Button type="submit" disabled={isExecuting}>
                    {isExecuting ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isExecuting}
                    asChild
                  >
                    <Link href="/settings/profile">Cancel</Link>
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Additional Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Note</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              • Email changes require verification and should be done through
              your account settings
            </p>
            <p>
              • Password changes can be managed through your Kinde account
              dashboard
            </p>
            <p>• Changes are saved immediately after confirmation</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function EditProfilePage() {
  return <EditProfileContent />;
}
