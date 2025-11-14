"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  grantConsentAction,
  revokeConsentAction,
} from "../actions/manage-consent";
import type { ConsentParticipant } from "@/server/db/schema/consent";

interface UseConsentProps {
  recordingId: string;
  initialParticipants?: ConsentParticipant[];
}

export function useConsent({
  recordingId,
  initialParticipants = [],
}: UseConsentProps) {
  const [participants, setParticipants] =
    useState<ConsentParticipant[]>(initialParticipants);
  const [isPending, startTransition] = useTransition();

  const grantConsent = async (
    email: string,
    name?: string,
    consentMethod: "explicit" | "implicit" | "bot-notification" = "explicit"
  ) => {
    return new Promise<void>((resolve, reject) => {
      startTransition(async () => {
        try {
          const result = await grantConsentAction({
            recordingId,
            participantEmail: email,
            participantName: name,
            consentMethod,
          });

          if (result?.serverError) {
            toast.error("Failed to grant consent", {
              description: result.serverError,
            });
            reject(new Error(result.serverError));
            return;
          }

          if (!result?.data) {
            toast.error("Failed to grant consent", {
              description: "No data returned from server",
            });
            reject(new Error("No data returned from server"));
            return;
          }

          // Use server-returned participant with server-generated ID
          const serverParticipant = result.data;

          // Update local state with server response
          const existingIndex = participants.findIndex(
            (p) => p.participantEmail === email
          );

          if (existingIndex >= 0) {
            const updated = [...participants];
            updated[existingIndex] = serverParticipant;
            setParticipants(updated);
          } else {
            setParticipants([...participants, serverParticipant]);
          }

          toast.success("Consent granted");
          resolve();
        } catch (error) {
          toast.error("Failed to grant consent", {
            description: error instanceof Error ? error.message : "Unknown error",
          });
          reject(error);
        }
      });
    });
  };

  const revokeConsent = async (email: string) => {
    return new Promise<void>((resolve, reject) => {
      startTransition(async () => {
        try {
          const result = await revokeConsentAction({
            recordingId,
            participantEmail: email,
          });

          if (result?.serverError) {
            toast.error("Failed to revoke consent", {
              description: result.serverError,
            });
            reject(new Error(result.serverError));
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
              : p
          );
          setParticipants(updated);

          toast.success("Consent revoked");
          resolve();
        } catch (error) {
          toast.error("Failed to revoke consent", {
            description: error instanceof Error ? error.message : "Unknown error",
          });
          reject(error);
        }
      });
    });
  };

  const hasConsent = (email: string): boolean => {
    const participant = participants.find((p) => p.participantEmail === email);
    return participant?.consentStatus === "granted";
  };

  const getConsentStatus = (email: string): ConsentParticipant["consentStatus"] | null => {
    const participant = participants.find((p) => p.participantEmail === email);
    return participant?.consentStatus ?? null;
  };

  const stats = {
    total: participants.length,
    granted: participants.filter((p) => p.consentStatus === "granted").length,
    pending: participants.filter((p) => p.consentStatus === "pending").length,
    revoked: participants.filter((p) => p.consentStatus === "revoked").length,
  };

  return {
    participants,
    isPending,
    grantConsent,
    revokeConsent,
    hasConsent,
    getConsentStatus,
    stats,
  };
}

