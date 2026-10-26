import { validEmail } from "./validation.ts";

export interface DeliveryConfig { apiKey: string; from: string; turnstileSecret: string; siteKey: string; origin: string }
export function readDeliveryConfig(env: Record<string, string | undefined> = process.env): DeliveryConfig {
  const apiKey = env.RESEND_API_KEY?.trim();
  const from = env.RESEND_FROM_EMAIL?.trim();
  const turnstileSecret = env.TURNSTILE_SECRET_KEY?.trim();
  const siteKey = env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();
  const rawOrigin = env.APP_ORIGIN?.trim();
  if (!apiKey || !from || !turnstileSecret || !siteKey || !rawOrigin || /[\r\n]/.test(from)) throw new Error("Delivery configuration unavailable");
  // Public testing bypass keys must never enable production delivery.
  if (/^[123]x0{6}/.test(siteKey) || /^[123]x0{6}/.test(turnstileSecret)) throw new Error("Delivery configuration unavailable");
  const match = from.match(/^(?:[^<>\r\n]{1,80} <([^<>\s]+)>|([^<>\s]+))$/);
  const sender = match?.[1] ?? match?.[2];
  if (!validEmail(sender) || sender.split("@")[1].toLowerCase() !== "etf.michalwebdeveloper.cz") throw new Error("Delivery configuration unavailable");
  const origin = new URL(rawOrigin);
  if (origin.username || origin.password || origin.search || origin.hash || origin.pathname !== "/" ||
    !(origin.protocol === "https:" || (origin.protocol === "http:" && ["localhost", "127.0.0.1"].includes(origin.hostname)))) throw new Error("Delivery configuration unavailable");
  return {apiKey, from, turnstileSecret, siteKey, origin: origin.origin};
}

export function publicDeliveryConfig() {
  try { const config = readDeliveryConfig(); return {enabled: true, siteKey: config.siteKey}; }
  catch { return {enabled: false, siteKey: ""}; }
}
