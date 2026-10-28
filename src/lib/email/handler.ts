import type { DeliveryConfig } from "./config.ts";
import { createGuideEmail, createReport } from "./content.ts";
import { DeliveryError } from "./providers.ts";
import type { OutgoingEmail } from "./providers.ts";
import { validateMaterialRequest, InputError } from "./validation.ts";
import type { MaterialKind } from "./validation.ts";

export const MAX_REQUEST_BYTES = 8192;
type Phase = "configuration" | "validation" | "turnstile" | "pdf" | "resend" | "content";
export interface DeliveryDiagnostic { material: MaterialKind; phase: Phase; code: string; providerStatus?: number }
// Construct an explicit allowlist object, never pass an exception or request.
function diagnostic(kind: MaterialKind, phase: Phase, error: unknown): DeliveryDiagnostic {
  const codes = ["provider_http", "timeout", "network", "invalid_response", "unexpected_response", "concurrent_request", "payload_conflict", "invalid_pdf", "unavailable", "verification_failed"];
  const code = error instanceof DeliveryError && codes.includes(error.code) ? error.code : "unavailable";
  const status = error instanceof DeliveryError ? error.providerStatus : undefined;
  return { material: kind, phase, code, ...(Number.isInteger(status) && status! >= 100 && status! <= 599 ? {providerStatus: status} : {}) };
}
interface Dependencies {
  config: () => DeliveryConfig;
  verify: (config: DeliveryConfig, token: string, kind: MaterialKind) => Promise<boolean>;
  send: (config: DeliveryConfig, email: OutgoingEmail) => Promise<void>;
  guide: () => Promise<Buffer>;
  log?: (entry: DeliveryDiagnostic) => void;
}
class RequestError extends Error {
  status: number;
  constructor(status: number) { super("Invalid request"); this.status = status; }
}

async function readBody(request: Request) {
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") throw new RequestError(415);
  const length = request.headers.get("content-length");
  if (length && (!/^\d+$/.test(length) || Number(length) > MAX_REQUEST_BYTES)) throw new RequestError(413);
  if (!request.body) throw new RequestError(400);
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const {value, done} = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_REQUEST_BYTES) { await reader.cancel(); throw new RequestError(413); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  try { return JSON.parse(new TextDecoder("utf-8", {fatal: true}).decode(Buffer.concat(chunks))); }
  catch { throw new RequestError(400); }
}

type PublicCode = "input_rejected" | "request_pending" | "request_conflict";
const reply = (status: number, message: string, code?: PublicCode) => Response.json({status: status === 202 ? "accepted" : "error", message, ...(code ? {code} : {})}, {
  status, headers: {"Cache-Control": "no-store", ...(status === 429 ? {"Retry-After": "60"} : {})},
});

export function createDeliveryHandler(kind: MaterialKind, deps: Dependencies) {
  const log = (phase: Phase, error: unknown) => {
    try { (deps.log ?? ((entry) => console.warn("email_delivery_failure", entry)))(diagnostic(kind, phase, error)); } catch { /* Diagnostics must never change delivery. */ }
  };
  return async (request: Request): Promise<Response> => {
    if (request.method !== "POST") return reply(405, "Použijte formulář na stránce.");
    let config: DeliveryConfig;
    try { config = deps.config(); } catch (error) { log("configuration", error); return reply(503, "Odesílání je momentálně nedostupné. Zkuste to později."); }
    if (request.headers.get("origin") !== config.origin || new URL(request.url).origin !== config.origin || request.headers.get("sec-fetch-site") === "cross-site") return reply(403, "Požadavek nelze přijmout. Otevřete formulář přímo na stránce.");
    let phase: Phase = "validation";
    try {
      const body = validateMaterialRequest(kind, await readBody(request));
      phase = "turnstile";
      if (!await deps.verify(config, body.turnstileToken, kind)) { log("turnstile", new DeliveryError(403, "verification_failed")); return reply(403, "Ověření proti robotům se nezdařilo nebo vypršelo. Zkuste ho znovu."); }
      phase = "content";
      const content = kind === "report" ? createReport(body.scenario!) : createGuideEmail();
      const outgoing: OutgoingEmail = { ...content, to: body.email, requestId: body.requestId, material: kind };
      if (kind === "guide") {
        phase = "pdf";
        const pdf = await deps.guide();
        if (pdf.length > 2 * 1024 * 1024 || pdf.subarray(0, 5).toString() !== "%PDF-") throw new DeliveryError(503, "invalid_pdf");
        outgoing.attachment = pdf;
      }
      phase = "resend";
      await deps.send(config, outgoing);
      return reply(202, "E-mailová služba přijala zprávu k odeslání. Zkontrolujte doručenou poštu i spam; přijetí službou ještě nepotvrzuje doručení.");
    } catch (error) {
      if (phase === "validation" && error instanceof InputError) return reply(400, "Zkontrolujte e-mail a parametry formuláře.", "input_rejected");
      if (phase === "validation" && error instanceof RequestError) return reply(error.status, error.status === 413 ? "Požadavek je příliš velký." : "Požadavek nemá správný formát.", error.status === 400 ? "input_rejected" : undefined);
      log(phase, error);
      if (error instanceof DeliveryError && error.status === 429) return reply(429, "Služba je dočasně vytížená. Zkuste to za chvíli.");
      if (phase === "resend" && error instanceof DeliveryError && error.code === "concurrent_request") return reply(503, "Požadavek se ještě zpracovává. Vyčkejte a zopakujte stejnou žádost.", "request_pending");
      if (phase === "resend" && error instanceof DeliveryError && error.code === "payload_conflict") return reply(503, "Tuto žádost nelze bezpečně zopakovat. Nejprve ověřte předchozí zaslání nebo kontaktujte správce.", "request_conflict");
      // Deliberately do not log addresses, request bodies, provider responses or credentials.
      return reply(503, "Zprávu se nepodařilo potvrdit. Zkuste požadavek znovu; opakování stejného obsahu chráníme proti duplicitnímu odeslání.");
    }
  };
}
