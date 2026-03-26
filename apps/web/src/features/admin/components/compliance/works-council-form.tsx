"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useRegisterWorksCouncilApproval } from "@/features/admin/hooks/use-register-works-council-approval";
import { useRef } from "react";
import { toast } from "sonner";

export function WorksCouncilForm() {
  const formRef = useRef<HTMLFormElement>(null);

  const { registerApproval, isRegistering } = useRegisterWorksCouncilApproval(
    () => formRef.current?.reset(),
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
