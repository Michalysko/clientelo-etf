import { validEmail } from "./validation.ts";

export interface DeliveryConfig { apiKey: string; from: string; turnstileSecret: string; siteKey: string; origin: string; demoAllowedEmails: readonly string[] }
const recipientKey = (email: string) => {
  const [local, domain] = email.split("@");
  return `${local}@${domain.toLowerCase()}`;
};
export function readDemoAllowedEmails(raw: string | undefined): readonly string[] {
  if (!raw || raw.length > 1024 || /[\r\n]/.test(raw)) throw new Error("Delivery configuration unavailable");
  const emails = raw.split(",").map(email => email.trim());
  if (emails.length !== 2 || !emails.every(validEmail) || emails.some(email => email.includes("*"))) throw new Error("Delivery configuration unavailable");
  const keys = emails.map(recipientKey);
  if (new Set(keys).size !== 2) throw new Error("Delivery configuration unavailable");
  return keys;
}
export function isDemoRecipientAllowed(email: string, allowed: readonly string[]): boolean {
  return validEmail(email) && allowed.includes(recipientKey(email));
}
export function readDeliveryConfig(env: Record<string, string | undefined> = process.env): DeliveryConfig {
  const apiKey = env.RESEND_API_KEY?.trim();
  const from = env.RESEND_FROM_EMAIL?.trim();
  const turnstileSecret = env.TURNSTILE_SECRET_KEY?.trim();
  const siteKey = env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();
  const rawOrigin = env.APP_ORIGIN?.trim();
  const demoAllowedEmails = readDemoAllowedEmails(env.DEMO_ALLOWED_EMAILS);
  if (!apiKey || !from || !turnstileSecret || !siteKey || !rawOrigin || /[\r\n]/.test(from)) throw new Error("Delivery configuration unavailable");
  // Public testing bypass keys must never enable production delivery.
  if (/^[123]x0{6}/.test(siteKey) || /^[123]x0{6}/.test(turnstileSecret)) throw new Error("Delivery configuration unavailable");
  const match = from.match(/^(?:[^<>\r\n]{1,80} <([^<>\s]+)>|([^<>\s]+))$/);
  const sender = match?.[1] ?? match?.[2];
  if (!validEmail(sender) || sender.split("@")[1].toLowerCase() !== "etf.michalwebdeveloper.cz") throw new Error("Delivery configuration unavailable");
  const origin = new URL(rawOrigin);
  if (origin.username || origin.password || origin.search || origin.hash || origin.pathname !== "/" ||
    !(origin.protocol === "https:" || (origin.protocol === "http:" && ["localhost", "127.0.0.1"].includes(origin.hostname)))) throw new Error("Delivery configuration unavailable");
  return {apiKey, from, turnstileSecret, siteKey, origin: origin.origin, demoAllowedEmails};
}

export function publicDeliveryConfig(env: Record<string, string | undefined> = process.env) {
  try { const config = readDeliveryConfig(env); return {enabled: true, siteKey: config.siteKey}; }
  catch { return {enabled: false, siteKey: ""}; }
}
