"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { registerWorksCouncilApproval } from "@/features/admin/actions/works-council-actions";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useRef } from "react";

interface WorksCouncilFormProps {
  hasActiveApproval: boolean;
}

export function WorksCouncilForm({
  hasActiveApproval: _hasActiveApproval,
}: WorksCouncilFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  const { execute: registerApproval, isExecuting: isRegistering } = useAction(
    registerWorksCouncilApproval,
    {
      onSuccess: () => {
        toast.success("OR-goedkeuring geregistreerd");
        formRef.current?.reset();
        router.refresh();
      },
      onError: ({ error }) => {
        toast.error(
          error.serverError || "Registratie van OR-goedkeuring mislukt",
        );
      },
    },
  );

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const documentUrl = formData.get("documentUrl") as string;
    const approvalDate = formData.get("approvalDate") as string;
    const scopeDescription =
      (formData.get("scopeDescription") as string) || undefined;

    if (!documentUrl || !approvalDate) {
      toast.error("Vul alle verplichte velden in");
      return;
    }

    registerApproval({
      documentUrl,
      approvalDate: new Date(approvalDate).toISOString(),
      scopeDescription,
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="documentUrl">Document URL *</Label>
        <Input
          id="documentUrl"
          name="documentUrl"
          type="url"
          placeholder="https://drive.google.com/file/d/..."
          required
        />
        <p className="text-xs text-muted-foreground">
          Link naar het OR-goedkeuringsdocument (PDF). Upload het document eerst
          naar Google Drive of een andere opslaglocatie.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="approvalDate">Goedkeuringsdatum *</Label>
        <Input id="approvalDate" name="approvalDate" type="date" required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="scopeDescription">Reikwijdte (optioneel)</Label>
        <Textarea
          id="scopeDescription"
          name="scopeDescription"
          placeholder="Bijv. 'Goedkeuring voor het opnemen van alle teamvergaderingen en projectbesprekingen'"
          rows={3}
        />
      </div>

      <Button type="submit" disabled={isRegistering}>
        {isRegistering ? "Registreren..." : "OR-goedkeuring registreren"}
      </Button>
    </form>
  );
}
