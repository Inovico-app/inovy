import crypto from "crypto";

interface VerifyRecallArgs {
  secret: string;
  headers: Record<string, string>;
  payload: string | null;
}

/**
 * Verify webhook requests from Recall.ai using the official method.
 * Per https://docs.recall.ai/docs/authenticating-requests-from-recallai
 * Signed string: webhook-id + webhook-timestamp + payload
 */
export function verifyRequestFromRecall(args: VerifyRecallArgs): void {
  const { secret, headers, payload } = args;
  const msgId = headers["webhook-id"] ?? headers["svix-id"];
  const msgTimestamp = headers["webhook-timestamp"] ?? headers["svix-timestamp"];
  const msgSignature = headers["webhook-signature"] ?? headers["svix-signature"];

  if (!secret || !secret.startsWith("whsec_")) {
    throw new Error("Verification secret is missing or invalid (must start with whsec_)");
  }
  if (!msgId || !msgTimestamp || !msgSignature) {
    throw new Error(
      `Missing webhook headers: id=${msgId ?? "missing"}, timestamp=${msgTimestamp ?? "missing"}, signature=${msgSignature ? "present" : "missing"}`
    );
  }

  const prefix = "whsec_";
  const base64Part = secret.startsWith(prefix) ? secret.slice(prefix.length) : secret;
  const key = Buffer.from(base64Part, "base64");

  let payloadStr = "";
  if (payload !== null) {
    payloadStr = typeof payload === "string" ? payload : String(payload);
  }

  const toSign = `${msgId}.${msgTimestamp}.${payloadStr}`;
  const expectedSig = crypto.createHmac("sha256", key).update(toSign).digest("base64");

  const passedSigs = msgSignature.split(" ");
  for (const versionedSig of passedSigs) {
    const parts = versionedSig.split(",");
    const version = parts[0];
    const signature = parts[1];
    if (version !== "v1" || signature === undefined) continue;

    const sigBytes = Buffer.from(signature, "base64");
    const expectedSigBytes = Buffer.from(expectedSig, "base64");
    if (
      expectedSigBytes.length === sigBytes.length &&
      crypto.timingSafeEqual(new Uint8Array(expectedSigBytes), new Uint8Array(sigBytes))
    ) {
      return;
    }
  }

  throw new Error("No matching signature found");
}
