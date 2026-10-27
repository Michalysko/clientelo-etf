import { validEmail } from "./email/validation.ts";

export const PRIVACY_CONTROLLER_NAME = "Michal Růžička";
export const PRIVACY_UPDATED_ON = "2026-10-27";

/** Public contact only. Never fall back to the private delivery configuration. */
export function getPrivacyContact(env: Record<string, string | undefined> = process.env) {
  const email = env.PRIVACY_CONTACT_EMAIL?.trim();
  if (!validEmail(email)) return null;
  return { email, href: `mailto:${encodeURIComponent(email)}` };
}
