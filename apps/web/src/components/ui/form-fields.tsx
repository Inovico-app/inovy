"use client";

import type { ReactNode } from "react";
import type {
  ControllerFieldState,
  ControllerRenderProps,
} from "react-hook-form";

import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

interface FormFieldProps {
  label: ReactNode;
  description?: ReactNode;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accept any typed Controller field
  field: ControllerRenderProps<any, any>;
  fieldState: ControllerFieldState;
}

type OmitFieldManaged = "id" | "name" | "value" | "aria-invalid";

function FieldInput({
  label,
  description,
  field,
  fieldState,
  ...props
}: FormFieldProps &
  Omit<React.ComponentProps<typeof Input>, OmitFieldManaged>) {
  const hasError = !!fieldState.error;

  return (
    <Field data-invalid={hasError || undefined}>
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      <Input
        id={field.name}
        aria-invalid={hasError || undefined}
        {...field}
        {...props}
      />
      {description && <FieldDescription>{description}</FieldDescription>}
      {hasError && <FieldError>{fieldState.error?.message}</FieldError>}
    </Field>
  );
}

function FieldTextarea({
  label,
  description,
  field,
  fieldState,
  ...props
}: FormFieldProps &
  Omit<React.ComponentProps<typeof Textarea>, OmitFieldManaged>) {
  const hasError = !!fieldState.error;

  return (
    <Field data-invalid={hasError || undefined}>
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      <Textarea
        id={field.name}
        aria-invalid={hasError || undefined}
        {...field}
        value={field.value ?? ""}
        {...props}
      />
      {description && <FieldDescription>{description}</FieldDescription>}
      {hasError && <FieldError>{fieldState.error?.message}</FieldError>}
    </Field>
  );
}

function FieldSlider({
  label,
  description,
  field,
  fieldState,
  ...props
}: FormFieldProps &
  Omit<
    React.ComponentProps<typeof Slider>,
    "value" | "onValueChange" | "id" | "aria-invalid"
  >) {
  const hasError = !!fieldState.error;

  return (
    <Field data-invalid={hasError || undefined}>
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      <Slider value={field.value} onValueChange={field.onChange} {...props} />
      {description && <FieldDescription>{description}</FieldDescription>}
      {hasError && <FieldError>{fieldState.error?.message}</FieldError>}
    </Field>
  );
}

function FieldSwitch({
  label,
  description,
  field,
  fieldState,
  ...props
}: FormFieldProps &
  Omit<
    React.ComponentProps<typeof Switch>,
    "checked" | "onCheckedChange" | "id" | "aria-invalid"
  >) {
  const hasError = !!fieldState.error;

  return (
    <Field orientation="horizontal" data-invalid={hasError || undefined}>
      <Switch
        id={field.name}
        aria-invalid={hasError || undefined}
        checked={field.value}
        onCheckedChange={field.onChange}
        {...props}
      />
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      {description && <FieldDescription>{description}</FieldDescription>}
      {hasError && <FieldError>{fieldState.error?.message}</FieldError>}
    </Field>
  );
}

function FieldSelect({
  label,
  description,
  field,
  fieldState,
  children,
}: FormFieldProps & { children: ReactNode }) {
  const hasError = !!fieldState.error;

  return (
    <Field data-invalid={hasError || undefined}>
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      {children}
      {description && <FieldDescription>{description}</FieldDescription>}
      {hasError && <FieldError>{fieldState.error?.message}</FieldError>}
    </Field>
  );
}

export { FieldInput, FieldTextarea, FieldSlider, FieldSwitch, FieldSelect };
export type { FormFieldProps };
