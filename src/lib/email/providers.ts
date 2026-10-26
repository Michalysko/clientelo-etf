import { createHmac } from "node:crypto";
import type { DeliveryConfig } from "./config.ts";
import type { EmailContent } from "./content.ts";
import type { MaterialKind } from "./validation.ts";

export interface OutgoingEmail extends EmailContent { to: string; attachment?: Buffer }
export class DeliveryError extends Error {
  status: number;
  constructor(status = 502) { super("Delivery provider unavailable"); this.status = status; }
}

export async function verifyTurnstile(config: DeliveryConfig, token: string, kind: MaterialKind, fetcher: typeof fetch = fetch): Promise<boolean> {
  const response = await fetcher("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST", headers: {"Content-Type": "application/json"},
    body: JSON.stringify({secret: config.turnstileSecret, response: token}),
    signal: AbortSignal.timeout(8000), cache: "no-store",
  });
  if (!response.ok) throw new DeliveryError(503);
  const data = await response.json();
  return data.success === true && data.hostname === new URL(config.origin).hostname && data.action === kind;
}

export function resendPayload(config: DeliveryConfig, email: OutgoingEmail) {
  return {
    from: config.from, to: [email.to], subject: email.subject, html: email.html, text: email.text,
    ...(email.attachment ? {attachments: [{filename: "etf-od-nuly.pdf", content: email.attachment.toString("base64"), content_type: "application/pdf"}]} : {}),
  };
}
export function resendIdempotencyKey(config: DeliveryConfig, email: OutgoingEmail) {
  // Hash the complete deterministic payload; no recipient, token or raw key in the header.
  return `etf-kompas/v1/${createHmac("sha256", config.apiKey).update(JSON.stringify(resendPayload(config, email))).digest("hex")}`;
}
export async function sendResend(config: DeliveryConfig, email: OutgoingEmail, fetcher: typeof fetch = fetch): Promise<void> {
  const response = await fetcher("https://api.resend.com/emails", {
    method: "POST", headers: {Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json", "Idempotency-Key": resendIdempotencyKey(config, email)},
    body: JSON.stringify(resendPayload(config, email)), signal: AbortSignal.timeout(12000), cache: "no-store",
  });
  if (!response.ok) throw new DeliveryError(response.status === 429 ? 429 : 502);
  const data = await response.json();
  if (typeof data.id !== "string" || !data.id) throw new DeliveryError();
}
