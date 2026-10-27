/** No browser access at import time. All analytics state is scoped to this document. */
export const UMAMI_WEBSITE_ID = "55615934-0f26-4e71-b7b2-d93427020fa6";
export const UMAMI_SCRIPT = "https://cloud.umami.is/script.js";
export const ANALYTICS_HOST = "etf-kompas-zeta.vercel.app";
export const CONSENT_KEY = "etf-kompas.analytics-consent.v1";
export const CONSENT_DAYS = 180;
export type Consent = "granted" | "denied";
export type Material = "report" | "guide";
export type AnalyticsError = "validation" | "verification" | "busy" | "server" | "network";
export type AnalyticsEvent =
  | { name: "landing_view" }
  | { name: "calculator_change"; field: "monthly_contribution" | "years" | "gross_return" }
  | { name: "etf_change"; position: "first" | "second"; ticker: "SPY" | "SPYM" | "VOO" | "IVV" }
  | { name: "form_view" | "form_start"; material: Material }
  | { name: "form_submit" | "material_accepted"; material: Material; attempt: "first" | "repeat" }
  | { name: "form_error"; material: Material; error: AnalyticsError; attempt?: "first" | "repeat" };
export interface AnalyticsPayload {
  website: string; hostname: string; url: string; title: string; referrer: string;
  name?: AnalyticsEvent["name"]; data?: Record<string, string>;
}
export interface AnalyticsLocation { href: string; pathname: string; referrer: string }
export interface FormAttempt { material: Material; ordinal: number; epoch: number }
const utmValues: Record<string, readonly string[]> = {
  utm_source: ["meta", "facebook", "instagram", "google", "linkedin", "clientelo", "demo"],
  utm_medium: ["paid_social", "cpc", "social", "referral", "demo"],
  utm_campaign: ["clientelo_demo", "etf_kompas"], utm_content: ["ad_a", "ad_b"],
};
const referrers = new Set(["facebook.com", "www.facebook.com", "l.facebook.com", "m.facebook.com", "instagram.com", "www.instagram.com", "google.com", "www.google.com", "google.cz", "www.google.cz", "linkedin.com", "www.linkedin.com"]);

export function readConsent(storage: Pick<Storage, "getItem"> & Partial<Pick<Storage, "removeItem">>, now = Date.now()): Consent | null {
  try {
    const value = JSON.parse(storage.getItem(CONSENT_KEY) ?? "null");
    const valid = value?.version === 1 && ["granted", "denied"].includes(value.choice) &&
      Number.isFinite(value.at) && value.at <= now && now - value.at < CONSENT_DAYS * 86400000;
    if (!valid) { try { storage.removeItem?.(CONSENT_KEY); } catch {} }
    return valid ? value.choice : null;
  } catch { try { storage.removeItem?.(CONSENT_KEY); } catch {} return null; }
}
export function saveConsent(storage: Pick<Storage, "setItem">, choice: Consent, now = Date.now()) {
  try { storage.setItem(CONSENT_KEY, JSON.stringify({ version: 1, choice, at: now })); return true; }
  catch { return false; }
}
export function campaignContext(href: string, referrer: string) {
  const query = new URLSearchParams();
  let hasCampaign = false;
  try {
    const input = new URL(href);
    for (const [key, allowed] of Object.entries(utmValues)) {
      const values = input.searchParams.getAll(key);
      if (values.length) hasCampaign = true;
      if (values.length === 1 && allowed.includes(values[0])) query.set(key, values[0]);
    }
  } catch { /* Invalid location produces a plain landing URL. */ }
  let source = "";
  try { const url = new URL(referrer); if (["https:", "http:"].includes(url.protocol) && !url.username && !url.password && referrers.has(url.hostname)) source = url.origin; } catch {}
  return { url: `/${query.size ? `?${query}` : ""}`, referrer: source, variant: query.get("utm_content") ?? "unknown", hasCampaign };
}

/** Exact event schemas: arbitrary data is rejected, never spread into the payload. */
export function eventData(event: unknown): { name: AnalyticsEvent["name"]; data: Record<string, string> } | null {
  if (!event || typeof event !== "object" || Array.isArray(event)) return null;
  const e = event as Record<string, unknown>;
  const schema: Record<string, Record<string, readonly string[]>> = {
    landing_view: {},
    calculator_change: { field: ["monthly_contribution", "years", "gross_return"] },
    etf_change: { position: ["first", "second"], ticker: ["SPY", "SPYM", "VOO", "IVV"] },
    form_view: { material: ["report", "guide"] }, form_start: { material: ["report", "guide"] },
    form_submit: { material: ["report", "guide"], attempt: ["first", "repeat"] },
    material_accepted: { material: ["report", "guide"], attempt: ["first", "repeat"] },
    form_error: { material: ["report", "guide"], error: ["validation", "verification", "busy", "server", "network"], attempt: ["first", "repeat"] },
  };
  if (typeof e.name !== "string" || !Object.hasOwn(schema, e.name)) return null;
  const fields = schema[e.name];
  if (Object.keys(e).some(key => key !== "name" && !Object.hasOwn(fields, key))) return null;
  const data: Record<string, string> = {};
  for (const [key, values] of Object.entries(fields)) {
    if (e.name === "form_error" && key === "attempt" && e[key] === undefined) continue;
    if (typeof e[key] !== "string" || !values.includes(e[key])) return null;
    data[key] = e[key];
  }
  return { name: e.name as AnalyticsEvent["name"], data };
}

export function createAnalyticsController(now = Date.now) {
  let active = false, epoch = 0, pathname = "", recorded = false;
  let validUntil = Infinity, contextEstablished = false;
  let context = campaignContext("https://example.invalid/", "");
  let transport: ((payload: AnalyticsPayload) => unknown) | null = null;
  const queue: AnalyticsPayload[] = [], once = new Set<string>(), attempts = { report: 0, guide: 0 };
  const listeners = new Set<() => void>();
  const pendingStarts = new Set<Material>();
  const pendingForms = new Map<Material, { event: AnalyticsEvent; key?: string }[]>();
  const notify = () => listeners.forEach(listener => { try { listener(); } catch {} });
  function close() {
    active = false; epoch++; queue.length = 0; transport = null; once.clear();
    pendingStarts.clear(); pendingForms.clear(); recorded = false; contextEstablished = false;
  }
  function activeNow() {
    if (active && now() >= validUntil) { close(); notify(); }
    return active;
  }
  const base = (): AnalyticsPayload => ({ website: UMAMI_WEBSITE_ID, hostname: ANALYTICS_HOST, url: context.url, title: "ETF Kompas", referrer: context.referrer });
  function deliver(payload: AnalyticsPayload) {
    if (!activeNow() || pathname !== "/") return;
    if (!transport) { if (queue.length < 32) queue.push(payload); return; }
    try { Promise.resolve(transport(payload)).catch(() => {}); } catch { /* Analytics is never a delivery dependency. */ }
  }
  function track(event: AnalyticsEvent, key?: string) {
    if (!activeNow() || pathname !== "/" || (key && once.has(key))) return false;
    const safe = eventData(event); if (!safe) return false;
    // Focus/pointer can precede the asynchronous intersection callback. Remember
    // only the fact of interaction, and release it after an observed form_view.
    if (event.name === "form_start") {
      if (once.has(`form_start:${event.material}`)) return false;
      if (!once.has(`form_view:${event.material}`)) { pendingStarts.add(event.material); return true; }
      key = `form_start:${event.material}`;
    }
    if (event.name === "form_view") key = `form_view:${event.material}`;
    if ("material" in event && event.name !== "form_view" && event.name !== "form_start" && !once.has(`form_view:${event.material}`)) {
      const pending = pendingForms.get(event.material) ?? [];
      if (pending.length < 16 && (!key || !pending.some(item => item.key === key))) {
        pending.push({ event: { name: safe.name, ...safe.data } as AnalyticsEvent, key });
        pendingForms.set(event.material, pending);
      }
      return true;
    }
    if (key && once.has(key)) return false;
    if (key) once.add(key);
    deliver({ ...base(), name: safe.name, data: { ...safe.data, ad_variant: context.variant } });
    if (event.name === "form_view") {
      if (pendingStarts.delete(event.material)) track({ name: "form_start", material: event.material });
      const pending = pendingForms.get(event.material) ?? []; pendingForms.delete(event.material);
      pending.forEach(item => track(item.event, item.key));
    }
    return true;
  }
  return {
    isActive: () => activeNow() && pathname === "/",
    hasConsent: activeNow,
    currentEpoch: () => activeNow() && pathname === "/" ? epoch : undefined,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    setConsent(granted: boolean, permitted: boolean, expiresAt = Infinity) {
      activeNow();
      const next = granted && permitted && expiresAt > now();
      if (next === active) return;
      if (!next) close();
      else { active = true; validUntil = expiresAt; epoch++; queue.length = 0; }
      notify();
    },
    enter(location: AnalyticsLocation) {
      if (!activeNow()) return;
      const candidate = location.pathname === "/" ? campaignContext(location.href, location.referrer) : null;
      const newCampaign = candidate && candidate.hasCampaign && candidate.url !== context.url;
      if (pathname !== location.pathname || newCampaign) {
        epoch++; recorded = false; once.clear(); pendingStarts.clear(); pendingForms.clear(); queue.length = 0;
      }
      pathname = location.pathname;
      if (pathname !== "/") { notify(); return; }
      if (!recorded) {
        // A bare internal return preserves the post-consent acquisition context.
        // Explicit, allowlisted campaign links establish a new context instead.
        if (!contextEstablished || newCampaign) { context = candidate!; contextEstablished = true; }
        recorded = true;
        deliver(base()); track({ name: "landing_view" });
        notify();
      }
    },
    ready(send: (payload: AnalyticsPayload) => unknown) {
      if (!activeNow()) return;
      transport = send;
      const pending = queue.splice(0); pending.forEach(deliver);
    },
    track,
    startAttempt(material: Material): FormAttempt | undefined {
      if (!activeNow() || pathname !== "/") return;
      const attempt = { material, ordinal: ++attempts[material], epoch };
      track({ name: "form_submit", material, attempt: attempt.ordinal === 1 ? "first" : "repeat" });
      return attempt;
    },
    finishAttempt(attempt: FormAttempt | undefined, error?: AnalyticsError) {
      if (!activeNow() || !attempt || attempt.epoch !== epoch) return;
      const common = { material: attempt.material, attempt: attempt.ordinal === 1 ? "first" as const : "repeat" as const };
      track(error ? { name: "form_error", ...common, error } : { name: "material_accepted", ...common }, `attempt:${attempt.material}:${attempt.ordinal}`);
    },
    /** This synchronous hook runs for every tracker request, including manual calls. */
    beforeSend(type: string, raw: unknown): AnalyticsPayload | false {
      if (!activeNow() || pathname !== "/" || type !== "event" || !raw || typeof raw !== "object") return false;
      const input = raw as Record<string, unknown>;
      if (input.website !== UMAMI_WEBSITE_ID) return false;
      if (input.name === undefined) return input.data === undefined ? base() : false;
      if (!input.data || typeof input.data !== "object" || Array.isArray(input.data)) return false;
      const { ad_variant: variant, ...properties } = input.data as Record<string, unknown>;
      if (variant !== context.variant) return false;
      const safe = eventData({ name: input.name, ...properties });
      return safe ? { ...base(), name: safe.name, data: { ...safe.data, ad_variant: context.variant } } : false;
    },
  };
}

export const analytics = createAnalyticsController();
export function trackAnalytics(event: AnalyticsEvent, key?: string) {
  try { return analytics.track(event, key); } catch { return false; }
}
export function beginFormAttempt(material: Material) {
  try { return analytics.startAttempt(material); } catch { return undefined; }
}
export function completeFormAttempt(attempt: FormAttempt | undefined, error?: AnalyticsError) {
  try { analytics.finishAttempt(attempt, error); } catch {}
}

/** Observe the visible form only while consent is active. No pre-consent observer/history. */
export function observeForm(element: Element, material: Material, controller = analytics, Observer: typeof IntersectionObserver | undefined = typeof IntersectionObserver === "undefined" ? undefined : IntersectionObserver) {
  let observer: IntersectionObserver | undefined;
  const sync = () => {
    observer?.disconnect(); observer = undefined;
    if (!controller.isActive() || !Observer) return;
    observer = new Observer(entries => {
      if (entries.some(entry => entry.isIntersecting && entry.intersectionRatio >= 0.1)) {
        controller.track({ name: "form_view", material }, `form_view:${material}`); observer?.disconnect();
      }
    }, { threshold: 0.1 });
    observer.observe(element);
  };
  const unsubscribe = controller.subscribe(sync); sync();
  return () => { observer?.disconnect(); unsubscribe(); };
}
