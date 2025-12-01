"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { OrganizationDetailDto } from "@/server/cache/organization.cache";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { Loader2Icon, SaveIcon } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { checkOrganizationSlug } from "../../actions/create-organization";
import { updateOrganization } from "../../actions/update-organization";

const organizationEditSchema = z.object({
  name: z.string().min(1, "Organization name is required").max(100),
  slug: z
    .string()
    .min(1, "Slug is required")
    .max(50)
    .regex(
      /^[a-z0-9-]+$/,
      "Slug must contain only lowercase letters, numbers, and hyphens"
    ),
  logo: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});

type OrganizationEditFormValues = z.infer<typeof organizationEditSchema>;

interface OrganizationEditFormProps {
  organization: OrganizationDetailDto;
}

export function OrganizationEditForm({
  organization,
}: OrganizationEditFormProps) {
  const [isCheckingSlug, setIsCheckingSlug] = useState(false);

  const form = useForm<OrganizationEditFormValues>({
    resolver: standardSchemaResolver(organizationEditSchema),
    defaultValues: {
      name: organization.name,
      slug: organization.slug,
      logo: organization.logo ?? "",
    },
  });

  const onSubmit = async (data: OrganizationEditFormValues) => {
    try {
      const result = await updateOrganization({
        id: organization.id,
        name: data.name,
        slug: data.slug,
        logo: data.logo || undefined,
      });

      if (result?.data) {
        toast.success("Organization updated successfully");
      } else if (result?.validationErrors) {
        const errors = Object.values(result.validationErrors)
          .flat()
          .filter((e): e is string => typeof e === "string");
        toast.error(errors[0] || "Validation error");
      } else if (result?.serverError) {
        toast.error(result.serverError);
      }
    } catch (error) {
      toast.error("Failed to update organization");
      console.error(error);
    }
  };

  // Check slug availability
  const handleSlugBlur = async () => {
    const slug = form.getValues("slug");
    if (!slug || slug === organization.slug) return;

    setIsCheckingSlug(true);
    try {
      const result = await checkOrganizationSlug({ slug });

      if (result?.data?.available === false) {
        form.setError("slug", {
          message: "This slug is already taken",
        });
      } else {
        form.clearErrors("slug");
      }
    } catch (error) {
      console.error("Error checking slug:", error);
    } finally {
      setIsCheckingSlug(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Organization</CardTitle>
        <CardDescription>Update the organization details</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Organization Name</FormLabel>
                  <FormControl>
                    <Input placeholder="My Organization" {...field} />
                  </FormControl>
                  <FormDescription>
                    The display name for the organization
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Slug</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        placeholder="my-org"
                        {...field}
                        onBlur={() => {
                          field.onBlur();
                          void handleSlugBlur();
                        }}
                      />
                      {isCheckingSlug && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <Loader2Icon className="h-4 w-4 animate-spin text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormDescription>
                    A unique identifier for the organization (lowercase,
                    numbers, and hyphens only)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="logo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Logo URL (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://example.com/logo.png"
                      type="url"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    A URL to the organization's logo image
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              disabled={form.formState.isSubmitting || isCheckingSlug}
            >
              {form.formState.isSubmitting ? (
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <SaveIcon className="mr-2 h-4 w-4" />
              )}
              Save Changes
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

