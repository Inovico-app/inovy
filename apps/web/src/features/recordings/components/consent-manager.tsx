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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConsentStatus } from "./consent-status";
import { useState, useTransition } from "react";
import {
  grantConsentAction,
  revokeConsentAction,
} from "../actions/manage-consent";
import { toast } from "sonner";
import type { ConsentParticipant } from "@/server/db/schema/consent";
import { Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";

interface ConsentManagerProps {
  recordingId: string;
  initialParticipants?: ConsentParticipant[];
  organizerEmail?: string;
}

export function ConsentManager({
  recordingId,
  initialParticipants = [],
  organizerEmail: _organizerEmail,
}: ConsentManagerProps) {
  const t = useTranslations("recordings");
  const [participants, setParticipants] = useState<ConsentParticipant[]>(
    () => initialParticipants,
  );
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newParticipantEmail, setNewParticipantEmail] = useState("");
  const [newParticipantName, setNewParticipantName] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleGrantConsent = (email: string, name?: string) => {
    startTransition(async () => {
      try {
        const result = await grantConsentAction({
          recordingId,
          participantEmail: email,
          participantName: name,
          consentMethod: "explicit",
        });

        if (result?.serverError) {
          toast.error(t("consent.grantConsentFailed"), {
            description: result.serverError,
          });
          return;
        }

        // Update local state
        const existingIndex = participants.findIndex(
          (p) => p.participantEmail === email,
        );

        if (existingIndex >= 0) {
          const updated = [...participants];
          updated[existingIndex] = {
            ...updated[existingIndex],
            consentStatus: "granted",
            consentGivenAt: new Date(),
          };
          setParticipants(updated);
        } else {
          setParticipants([
            ...participants,
            {
              id: crypto.randomUUID(),
              recordingId,
              participantEmail: email,
              participantName: name ?? null,
              consentStatus: "granted",
              consentMethod: "explicit",
              consentGivenAt: new Date(),
              consentRevokedAt: null,
              ipAddress: null,
              userAgent: null,
              userId: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ]);
        }

        toast.success(t("consent.grantConsentSuccess"), {
          description: t("consent.grantConsentSuccessDescription", { email }),
        });

        setIsAddDialogOpen(false);
        setNewParticipantEmail("");
        setNewParticipantName("");
      } catch (error) {
        toast.error("Failed to grant consent", {
          description: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });
  };

  const handleRevokeConsent = (email: string) => {
    startTransition(async () => {
      try {
        const result = await revokeConsentAction({
          recordingId,
          participantEmail: email,
        });

        if (result?.serverError) {
          toast.error(t("consent.revokeConsentFailed"), {
            description: result.serverError,
          });
          return;
        }

        // Update local state
        const updated = participants.map((p) =>
          p.participantEmail === email
            ? {
                ...p,
                consentStatus: "revoked" as const,
                consentRevokedAt: new Date(),
              }
            : p,
        );
        setParticipants(updated);

        toast.success(t("consent.revokeConsentSuccess"), {
          description: t("consent.revokeConsentSuccessDescription", { email }),
        });
      } catch (error) {
        toast.error("Failed to revoke consent", {
          description: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });
  };

  const handleAddParticipant = () => {
    if (!newParticipantEmail.trim()) {
      toast.error(t("consent.emailRequired"));
      return;
    }

    handleGrantConsent(
      newParticipantEmail.trim(),
      newParticipantName.trim() || undefined,
    );
  };

  const stats = {
    total: participants.length,
    granted: participants.filter((p) => p.consentStatus === "granted").length,
    pending: participants.filter((p) => p.consentStatus === "pending").length,
    revoked: participants.filter((p) => p.consentStatus === "revoked").length,
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{t("consent.consentManagement")}</CardTitle>
            <CardDescription>
              {t("consent.consentManagementDescription")}
            </CardDescription>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger
              render={<Button size="sm" variant="outline" className="gap-2" />}
            >
              <Plus className="h-4 w-4" />
              {t("consent.addParticipant")}
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("consent.addParticipantConsent")}</DialogTitle>
                <DialogDescription>
                  {t("consent.addParticipantDescription")}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="email">{t("consent.emailAddress")}</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder={t("consent.emailPlaceholder")}
                    value={newParticipantEmail}
                    onChange={(e) => setNewParticipantEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">{t("consent.nameOptional")}</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder={t("consent.namePlaceholder")}
                    value={newParticipantName}
                    onChange={(e) => setNewParticipantName(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleAddParticipant} disabled={isPending}>
                  {t("consent.grantConsent")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Statistics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg border p-3">
            <div className="text-sm text-muted-foreground">
              {t("consent.total")}
            </div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-sm text-muted-foreground">
              {t("consent.granted")}
            </div>
            <div className="text-2xl font-bold text-green-600">
              {stats.granted}
            </div>
          </div>
        </div>

        {/* Participants List */}
        {participants.length > 0 ? (
          <div className="space-y-2">
            <h4 className="font-medium text-sm">{t("consent.participants")}</h4>
            <div className="space-y-2">
              {participants.map((participant) => (
                <div
                  key={participant.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">
                      {participant.participantName ||
                        participant.participantEmail}
                    </div>
                    {participant.participantName && (
                      <div className="text-sm text-muted-foreground truncate">
                        {participant.participantEmail}
                      </div>
                    )}
                    {participant.consentGivenAt && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {t("consent.consentGrantedAt")}{" "}
                        {new Date(participant.consentGivenAt).toLocaleString()}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <ConsentStatus status={participant.consentStatus} />
                    {participant.consentStatus === "granted" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          handleRevokeConsent(participant.participantEmail)
                        }
                        disabled={isPending}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>{t("consent.noParticipants")}</p>
            <p className="text-sm mt-2">{t("consent.addParticipantsHint")}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
