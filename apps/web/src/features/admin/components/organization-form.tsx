"use client";

import { Button } from "@/components/ui/button";
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
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import {
  checkOrganizationSlug,
  createOrganization,
} from "../actions/create-organization";

const organizationFormSchema = z.object({
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

type OrganizationFormValues = z.infer<typeof organizationFormSchema>;

interface OrganizationFormProps {
  defaultValues?: Partial<OrganizationFormValues>;
  onSuccess?: () => void;
  submitLabel?: string;
}

export function OrganizationForm({
  defaultValues,
  onSuccess,
  submitLabel = "Create Organization",
}: OrganizationFormProps) {
  const router = useRouter();
  const [isCheckingSlug, setIsCheckingSlug] = useState(false);

  const form = useForm<OrganizationFormValues>({
    resolver: zodResolver(organizationFormSchema),
    defaultValues: {
      name: defaultValues?.name ?? "",
      slug: defaultValues?.slug ?? "",
      logo: defaultValues?.logo ?? "",
    },
  });

  const onSubmit = async (data: OrganizationFormValues) => {
    try {
      const result = await createOrganization({
        name: data.name,
        slug: data.slug,
        logo: data.logo || undefined,
      });

      if (result?.data) {
        toast.success("Organization created successfully");
        form.reset();
        onSuccess?.();
        router.push("/admin/organizations");
      } else if (result?.validationError) {
        toast.error(result.validationError);
      } else if (result?.serverError) {
        toast.error(result.serverError);
      }
    } catch (error) {
      toast.error("Failed to create organization");
      console.error(error);
    }
  };

  // Auto-generate slug from name
  const handleNameChange = (value: string) => {
    const slug = value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();

    form.setValue("slug", slug);
  };

  // Check slug availability
  const handleSlugBlur = async () => {
    const slug = form.getValues("slug");
    if (!slug || slug === defaultValues?.slug) return;

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
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Organization Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="My Organization"
                  {...field}
                  onChange={(e) => {
                    field.onChange(e);
                    handleNameChange(e.target.value);
                  }}
                />
              </FormControl>
              <FormDescription>
                The display name for your organization
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
                A unique identifier for the organization (lowercase, numbers,
                and hyphens only)
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

        <div className="flex gap-3">
          <Button
            type="submit"
            disabled={form.formState.isSubmitting || isCheckingSlug}
          >
            {form.formState.isSubmitting && (
              <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
            )}
            {submitLabel}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={form.formState.isSubmitting}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}

