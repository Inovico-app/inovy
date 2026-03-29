"use client";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { FieldInput } from "@/components/ui/form-fields";
import { Input } from "@/components/ui/input";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";

import { Loader2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { z } from "zod";
import {
  checkOrganizationSlug,
  createOrganization,
} from "../../actions/create-organization";

const organizationFormSchema = z.object({
  name: z.string().min(1, "Organization name is required").max(100),
  slug: z
    .string()
    .min(1, "Slug is required")
    .max(50)
    .regex(
      /^[a-z0-9-]+$/,
      "Slug must contain only lowercase letters, numbers, and hyphens",
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
  const t = useTranslations("admin.organizations");
  const router = useRouter();
  const [isCheckingSlug, setIsCheckingSlug] = useState(false);

  const form = useForm<OrganizationFormValues>({
    resolver: standardSchemaResolver(organizationFormSchema),
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
        toast.success(t("organizationCreated"));
        form.reset();
        onSuccess?.();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        router.push("/admin/organizations" as any);
      } else if (result?.validationErrors) {
        const errors = Object.values(result.validationErrors)
          .flat()
          .filter((e): e is string => typeof e === "string");
        toast.error(errors[0] || "Validation error");
      } else if (result?.serverError) {
        toast.error(result.serverError);
      }
    } catch (error) {
      toast.error(t("organizationCreateFailed"));
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
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FieldGroup>
          <Controller
            control={form.control}
            name="name"
            render={({ field, fieldState }) => (
              <FieldInput
                label={t("organizationName")}
                description="The display name for your organization"
                field={field}
                fieldState={fieldState}
                placeholder="My Organization"
                onChange={(e) => {
                  field.onChange(e);
                  handleNameChange(e.target.value);
                }}
              />
            )}
          />

          <Controller
            control={form.control}
            name="slug"
            render={({ field, fieldState }) => (
              <Field data-invalid={!!fieldState.error || undefined}>
                <FieldLabel htmlFor={field.name}>{t("slugLabel")}</FieldLabel>
                <div className="relative">
                  <Input
                    id={field.name}
                    aria-invalid={!!fieldState.error || undefined}
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
                <FieldDescription>
                  A unique identifier for the organization (lowercase, numbers,
                  and hyphens only)
                </FieldDescription>
                {fieldState.error && (
                  <FieldError>{fieldState.error.message}</FieldError>
                )}
              </Field>
            )}
          />

          <Controller
            control={form.control}
            name="logo"
            render={({ field, fieldState }) => (
              <FieldInput
                label={t("logoUrl")}
                description="A URL to the organization's logo image"
                field={field}
                fieldState={fieldState}
                placeholder="https://example.com/logo.png"
                type="url"
              />
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
        </FieldGroup>
      </form>
    </Form>
  );
}
