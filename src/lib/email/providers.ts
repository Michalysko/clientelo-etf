import { createHmac } from "node:crypto";
import type { DeliveryConfig } from "./config.ts";
import type { EmailContent } from "./content.ts";
import type { MaterialKind } from "./validation.ts";

export interface OutgoingEmail extends EmailContent { to: string; attachment?: Buffer; requestId: string; material: MaterialKind }
export type FailureCode = "provider_http" | "timeout" | "network" | "invalid_response" | "unexpected_response" | "concurrent_request" | "payload_conflict" | "invalid_pdf" | "unavailable" | "verification_failed";
export class DeliveryError extends Error {
  status: number;
  code: FailureCode;
  providerStatus?: number;
  constructor(status = 502, code: FailureCode = "unavailable", providerStatus?: number) { super("Delivery provider unavailable"); this.status = status; this.code = code; this.providerStatus = providerStatus; }
}

async function providerFetch(fetcher: typeof fetch, url: string, init: RequestInit) {
  try { return await fetcher(url, init); }
  catch (error) { throw new DeliveryError(503, error instanceof Error && ["TimeoutError", "AbortError"].includes(error.name) ? "timeout" : "network"); }
}

/** Classify transport failures without exposing exception messages or bodies. */
async function providerJson(response: Response): Promise<Record<string, unknown>> {
  let data: unknown;
  try { data = await response.json(); }
  catch (error) {
    const code = error instanceof Error && ["TimeoutError", "AbortError"].includes(error.name) ? "timeout"
      : error instanceof SyntaxError ? "invalid_response" : "network";
    throw new DeliveryError(503, code, response.status);
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new DeliveryError(503, "unexpected_response", response.status);
  return data as Record<string, unknown>;
}

export async function verifyTurnstile(config: DeliveryConfig, token: string, kind: MaterialKind, fetcher: typeof fetch = fetch): Promise<boolean> {
  const response = await providerFetch(fetcher, "https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST", headers: {"Content-Type": "application/json"},
    body: JSON.stringify({secret: config.turnstileSecret, response: token}),
    signal: AbortSignal.timeout(8000), cache: "no-store",
  });
  if (!response.ok) throw new DeliveryError(503, "provider_http", response.status);
  const data = await providerJson(response);
  if (typeof data.success !== "boolean" || (data.success && (typeof data.hostname !== "string" || typeof data.action !== "string"))) throw new DeliveryError(503, "unexpected_response", response.status);
  return data.success === true && data.hostname === new URL(config.origin).hostname && data.action === kind;
}

export function resendPayload(config: DeliveryConfig, email: OutgoingEmail) {
  return {
    from: config.from, to: [email.to], subject: email.subject, html: email.html, text: email.text,
    ...(email.attachment ? {attachments: [{filename: "etf-od-nuly.pdf", content: email.attachment.toString("base64"), content_type: "application/pdf"}]} : {}),
  };
}
export function resendIdempotencyKey(config: DeliveryConfig, email: OutgoingEmail) {
  // Stable per logical request, not per content. Resend rejects changed payloads
  // under the same key, preventing a retry from silently changing its recipient.
  return `etf-kompas/v2/${email.material}/${createHmac("sha256", config.apiKey).update(email.requestId).digest("hex")}`;
}
export async function sendResend(config: DeliveryConfig, email: OutgoingEmail, fetcher: typeof fetch = fetch): Promise<void> {
  const response = await providerFetch(fetcher, "https://api.resend.com/emails", {
    method: "POST", headers: {Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json", "Idempotency-Key": resendIdempotencyKey(config, email)},
    body: JSON.stringify(resendPayload(config, email)), signal: AbortSignal.timeout(12000), cache: "no-store",
  });
  if (!response.ok) {
    // HTTP throttling remains authoritative even if its body is unreadable.
    if (response.status === 429) throw new DeliveryError(429, "provider_http", 429);
    const body = await providerJson(response);
    const code = response.status === 409 && body.name === "concurrent_idempotent_requests" ? "concurrent_request"
      : response.status === 409 && body.name === "invalid_idempotent_request" ? "payload_conflict" : "provider_http";
    throw new DeliveryError(response.status === 429 ? 429 : 502, code, response.status);
  }
  const data = await providerJson(response);
  if (typeof data.id !== "string" || !data.id) throw new DeliveryError(502, "unexpected_response", response.status);
}
