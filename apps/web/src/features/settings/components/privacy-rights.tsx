"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type {
  PrivacyRequest,
  PrivacyRequestType,
  ProcessingScope,
} from "@/server/db/schema/privacy-requests";
import { format } from "date-fns";
import { Hand, Info, Loader2, ShieldAlert, X } from "lucide-react";
import { useState } from "react";
import { usePrivacyRequests } from "../hooks/use-privacy-requests";

const SCOPE_LABELS: Record<ProcessingScope, string> = {
  ai_analysis: "AI Analysis",
  usage_analytics: "Usage Analytics",
  marketing: "Marketing",
  all_processing: "All Processing",
};

const TYPE_LABELS: Record<PrivacyRequestType, string> = {
  restriction: "Restriction",
  objection: "Objection",
};

interface PrivacyRightsProps {
  initialRequests?: PrivacyRequest[];
}

export function PrivacyRights({ initialRequests = [] }: PrivacyRightsProps) {
  const [selectedType, setSelectedType] = useState<PrivacyRequestType | "">("");
  const [selectedScope, setSelectedScope] = useState<ProcessingScope | "">("");
  const [reason, setReason] = useState("");

  const {
    requests,
    activeRequests,
    isSubmitting,
    isWithdrawing,
    submitRequest,
    withdrawRequest,
  } = usePrivacyRequests(initialRequests);

  const handleSubmit = () => {
    if (!selectedType || !selectedScope) return;
    submitRequest(selectedType, selectedScope, reason || undefined);
    setSelectedType("");
    setSelectedScope("");
    setReason("");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-primary" />
          Privacy Rights
        </CardTitle>
        <CardDescription>
          Exercise your GDPR rights to restrict processing (Art. 18) or object
          to processing (Art. 21) of your personal data.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Info alert */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Right to Restriction (Art. 18)</strong> temporarily halts
            processing of your data while a dispute is resolved.{" "}
            <strong>Right to Object (Art. 21)</strong> allows you to object to
            processing based on legitimate interest. Requests are reviewed by
            our Data Protection Officer within 30 days.
          </AlertDescription>
        </Alert>

        {/* Active requests */}
        {activeRequests.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Active Requests</h4>
            {activeRequests.map((request) => (
              <div
                key={request.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="bg-amber-50 text-amber-700 border-amber-200"
                    >
                      {TYPE_LABELS[request.type as PrivacyRequestType]}
                    </Badge>
                    <Badge variant="secondary">
                      {SCOPE_LABELS[request.scope as ProcessingScope]}
                    </Badge>
                  </div>
                  {request.reason && (
                    <p className="text-xs text-muted-foreground">
                      {request.reason}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Requested{" "}
                    {format(new Date(request.requestedAt), "MMM d, yyyy")}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => withdrawRequest(request.id)}
                  disabled={isWithdrawing}
                >
                  {isWithdrawing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <X className="h-4 w-4" />
                  )}
                  <span className="sr-only">Withdraw</span>
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Submit new request form */}
        <div className="space-y-4 border-t pt-4">
          <h4 className="text-sm font-medium">Submit New Request</h4>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="request-type">Request Type</Label>
              <Select
                value={selectedType}
                onValueChange={(val) =>
                  setSelectedType(val as PrivacyRequestType)
                }
              >
                <SelectTrigger id="request-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="restriction">
                    <span className="flex items-center gap-2">
                      <ShieldAlert className="h-3.5 w-3.5" />
                      Restrict Processing
                    </span>
                  </SelectItem>
                  <SelectItem value="objection">
                    <span className="flex items-center gap-2">
                      <Hand className="h-3.5 w-3.5" />
                      Object to Processing
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="processing-scope">Processing Scope</Label>
              <Select
                value={selectedScope}
                onValueChange={(val) =>
                  setSelectedScope(val as ProcessingScope)
                }
              >
                <SelectTrigger id="processing-scope">
                  <SelectValue placeholder="Select scope" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ai_analysis">AI Analysis</SelectItem>
                  <SelectItem value="usage_analytics">
                    Usage Analytics
                  </SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="all_processing">All Processing</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">
              Reason <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Briefly describe why you are making this request..."
              maxLength={1000}
              rows={3}
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedType || !selectedScope}
            className="w-full sm:w-auto"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit Request"
            )}
          </Button>
        </div>

        {/* Request history */}
        {requests.length > 0 && requests.some((r) => r.status !== "active") && (
          <div className="space-y-3 border-t pt-4">
            <h4 className="text-sm font-medium text-muted-foreground">
              Request History
            </h4>
            {requests
              .filter((r) => r.status !== "active")
              .map((request) => (
                <div
                  key={request.id}
                  className="flex items-center gap-2 p-2 text-sm text-muted-foreground"
                >
                  <Badge
                    variant="outline"
                    className={
                      request.status === "resolved"
                        ? "bg-green-50 text-green-700 border-green-200"
                        : "bg-gray-50 text-gray-500 border-gray-200"
                    }
                  >
                    {request.status}
                  </Badge>
                  <span>
                    {TYPE_LABELS[request.type as PrivacyRequestType]} —{" "}
                    {SCOPE_LABELS[request.scope as ProcessingScope]}
                  </span>
                  <span className="ml-auto text-xs">
                    {format(new Date(request.requestedAt), "MMM d, yyyy")}
                  </span>
                </div>
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
