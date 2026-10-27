import test from "node:test";
import assert from "node:assert/strict";
import { createAnalyticsController, campaignContext, eventData, observeForm, readConsent, saveConsent, CONSENT_KEY, UMAMI_WEBSITE_ID } from "../src/lib/analytics.ts";
import type { AnalyticsPayload } from "../src/lib/analytics.ts";

const location = (variant = "ad_a") => ({ pathname: "/", href: `https://etf-kompas-zeta.vercel.app/?utm_source=meta&utm_medium=paid_social&utm_campaign=clientelo_demo&utm_content=${variant}&email=private%40example.com&amount=999999#secret`, referrer: "https://www.facebook.com/private?email=private@example.com" });
function measured(variant = "ad_a") {
  const controller = createAnalyticsController(), sent: AnalyticsPayload[] = [];
  controller.setConsent(true, true); controller.enter(location(variant)); controller.ready(payload => { sent.push(payload); });
  return { controller, sent };
}
test("no transport/queue before consent or after refusal; non-production gate stays closed", () => {
  const c = createAnalyticsController(), sent: unknown[] = [];
  c.enter(location()); c.track({ name: "landing_view" }); c.ready(p => sent.push(p));
  c.setConsent(false, true); c.track({ name: "form_start", material: "report" });
  c.setConsent(true, false); c.enter(location()); c.ready(p => sent.push(p));
  assert.equal(sent.length, 0); assert.equal(c.beforeSend("event", {}), false);
  c.setConsent(true, true); c.enter(location()); c.ready(p => sent.push(p));
  assert.equal(sent.length, 2); // No pre-consent history replayed.
});
test("exactly one pageview and landing event per measured route entry, including repeated effects", () => {
  const { controller: c, sent } = measured();
  c.setConsent(true, true); c.enter(location()); c.ready(p => sent.push(p)); c.enter(location());
  assert.equal(sent.filter(p => !p.name).length, 1); assert.equal(sent.filter(p => p.name === "landing_view").length, 1);
  c.enter({ ...location(), pathname: "/ochrana-osobnich-udaju" }); c.track({ name: "landing_view" });
  assert.equal(sent.length, 2); c.enter(location()); assert.equal(sent.filter(p => !p.name).length, 2);
});
test("withdrawal closes hook and queue immediately, including outstanding attempts", () => {
  const { controller: c, sent } = measured(); const attempt = c.startAttempt("report");
  c.setConsent(false, false); const count = sent.length;
  c.finishAttempt(attempt); c.track({ name: "form_start", material: "report" });
  assert.equal(c.beforeSend("event", { website: UMAMI_WEBSITE_ID }), false); assert.equal(sent.length, count);
  c.setConsent(true, true); c.enter(location()); c.ready(p => sent.push(p)); const count2 = sent.length;
  c.finishAttempt(attempt); assert.equal(sent.length, count2);
});
test("strict campaign values, duplicate keys, URL/query/hash and referrer are sanitized", () => {
  const a = campaignContext(location().href, location().referrer);
  assert.equal(a.url, "/?utm_source=meta&utm_medium=paid_social&utm_campaign=clientelo_demo&utm_content=ad_a");
  assert.equal(a.referrer, "https://www.facebook.com");
  assert.equal(campaignContext(location("ad_b").href, "").variant, "ad_b");
  for (const suffix of ["utm_source=private@example.com", "utm_campaign=private@example.com", "utm_content=ad_a&utm_content=ad_b", "utm_content=arbitrary"]) {
    const value = campaignContext(`https://example.com/?${suffix}`, "https://private.example/path?email=x");
    assert.equal(value.url, "/"); assert.equal(value.variant, "unknown"); assert.equal(value.referrer, "");
  }
});
test("payload firewall rejects unknown properties and removes all default/browser metadata", () => {
  const { controller: c } = measured();
  const base = { website: UMAMI_WEBSITE_ID, url: "https://evil.example/?email=private@example.com", referrer: "https://evil.example/private", title: "private", screen: "999x888", language: "private", id: "private", name: "form_start", data: { material: "report", ad_variant: "ad_a" } };
  const safe = c.beforeSend("event", base); assert.ok(safe);
  assert.deepEqual(Object.keys(safe).sort(), ["data", "hostname", "name", "referrer", "title", "url", "website"]);
  assert.ok(!JSON.stringify(safe).includes("private"));
  for (const key of ["email", "amount", "grossReturn", "turnstileToken", "idempotencyKey", "message"]) {
    assert.equal(c.beforeSend("event", { ...base, data: { ...base.data, [key]: "private" } }), false);
  }
  assert.equal(c.beforeSend("identify", base), false); assert.equal(c.beforeSend("performance", base), false);
  assert.equal(eventData({ name: "calculator_change", field: "years", value: 20 }), null);
  assert.equal(eventData({ name: "etf_change", position: "first", ticker: "UNKNOWN" }), null);
});
test("form start/view once, retry attempts remain distinct and report/guide independent", () => {
  const { controller: c, sent } = measured();
  for (const material of ["report", "guide"] as const) {
    for (let i = 0; i < 3; i++) c.track({ name: "form_start", material }, `form_start:${material}`);
    c.track({ name: "form_view", material });
    const first = c.startAttempt(material); c.finishAttempt(first, "network"); c.finishAttempt(first);
    const repeat = c.startAttempt(material); c.finishAttempt(repeat); c.finishAttempt(repeat);
  }
  assert.equal(sent.filter(p => p.name === "form_start").length, 2);
  assert.equal(sent.filter(p => p.name === "form_submit").length, 4);
  assert.equal(sent.filter(p => p.name === "material_accepted").length, 2);
  assert.ok(sent.filter(p => p.name === "material_accepted").every(p => p.data?.attempt === "repeat"));
});

test("pending POST completion is dropped after ad_a → privacy → ad_b or direct campaign navigation", () => {
  for (const privacy of [false, true]) {
    const { controller: c, sent } = measured("ad_a");
    c.track({ name: "form_view", material: "report" });
    const attempt = c.startAttempt("report");
    if (privacy) c.enter({ ...location(), pathname: "/ochrana-osobnich-udaju" });
    c.enter(location("ad_b")); c.track({ name: "form_view", material: "report" }); c.finishAttempt(attempt);
    assert.equal(sent.filter(p => p.name === "material_accepted").length, 0);
    const fresh = c.startAttempt("report"); c.finishAttempt(fresh);
    assert.equal(sent.filter(p => p.name === "material_accepted").at(-1)?.data?.ad_variant, "ad_b");
  }
});

test("post-consent campaign survives privacy → bare landing; new explicit campaign replaces it", () => {
  const { controller: c, sent } = measured("ad_a");
  c.enter({ ...location(), pathname: "/ochrana-osobnich-udaju" });
  c.enter({ pathname: "/", href: "https://etf-kompas-zeta.vercel.app/", referrer: "" });
  assert.equal(sent.filter(p => p.name === "landing_view").at(-1)?.data?.ad_variant, "ad_a");
  c.enter(location("ad_b")); assert.equal(sent.filter(p => p.name === "landing_view").at(-1)?.data?.ad_variant, "ad_b");
  c.enter(location("invalid_campaign")); assert.equal(sent.filter(p => p.name === "landing_view").at(-1)?.data?.ad_variant, "unknown");
  c.setConsent(false, false); c.setConsent(true, true); c.enter({ pathname: "/", href: "https://etf-kompas-zeta.vercel.app/", referrer: "" });
  c.ready(p => sent.push(p)); assert.equal(sent.filter(p => p.name === "landing_view").at(-1)?.data?.ad_variant, "unknown");
});

test("asynchronous visibility orders view → start → submit → accepted, without mount-only views or duplicates", () => {
  const { controller: c, sent } = measured();
  c.track({ name: "form_start", material: "guide" }); c.track({ name: "form_start", material: "guide" });
  const attempt = c.startAttempt("guide"); c.finishAttempt(attempt); c.finishAttempt(attempt);
  assert.deepEqual(sent.filter(p => p.data?.material === "guide"), []);
  c.track({ name: "form_view", material: "guide" }); c.track({ name: "form_view", material: "guide" });
  assert.deepEqual(sent.filter(p => p.data?.material === "guide").map(p => p.name), ["form_view", "form_start", "form_submit", "material_accepted"]);
});

test("consent expires at dispatch even before periodic UI check; expired records are removed when possible", () => {
  let now = 100; const c = createAnalyticsController(() => now), sent: AnalyticsPayload[] = [];
  c.setConsent(true, true, 200); c.enter(location()); c.ready(p => sent.push(p));
  now = 200; c.track({ name: "landing_view" });
  assert.equal(sent.length, 2); assert.equal(c.hasConsent(), false); assert.equal(c.beforeSend("event", { website: UMAMI_WEBSITE_ID }), false);
  let raw: string | null = JSON.stringify({ version: 1, choice: "denied", at: 0 });
  assert.equal(readConsent({ getItem: () => raw, removeItem: () => { raw = null; } }, 180 * 86400000), null);
  assert.equal(raw, null);
  assert.equal(readConsent({ getItem: () => '{"version":1,"choice":"granted","at":0}', removeItem() { throw new Error(); } }, 180 * 86400000), null);
});
test("IntersectionObserver starts only with consent, requires visible intersection, disconnects and deduplicates", () => {
  const c = createAnalyticsController(), sent: AnalyticsPayload[] = [];
  const instances: FakeObserver[] = [];
  class FakeObserver {
    disconnected = false;
    callback: IntersectionObserverCallback;
    constructor(callback: IntersectionObserverCallback) { this.callback = callback; instances.push(this); }
    observe() {} disconnect() { this.disconnected = true; }
  }
  const cleanup = observeForm({} as Element, "report", c, FakeObserver as unknown as typeof IntersectionObserver);
  assert.equal(instances.length, 0);
  c.setConsent(true, true); c.enter(location()); c.ready(p => sent.push(p));
  const observer = instances.at(-1)!;
  observer.callback([{ isIntersecting: false, intersectionRatio: 0 }] as IntersectionObserverEntry[], {} as IntersectionObserver);
  assert.equal(sent.filter(p => p.name === "form_view").length, 0);
  for (let i = 0; i < 3; i++) observer.callback([{ isIntersecting: true, intersectionRatio: 0.5 }] as IntersectionObserverEntry[], {} as IntersectionObserver);
  assert.equal(sent.filter(p => p.name === "form_view").length, 1); assert.equal(observer.disconnected, true);
  c.setConsent(false, true); cleanup();
});
test("analytics transport throws/rejections do not propagate into application", async () => {
  const { controller: c } = measured();
  c.ready(() => { throw new Error("mock analytics failure"); }); assert.doesNotThrow(() => c.startAttempt("report"));
  c.ready(() => Promise.reject(new Error("mock network failure"))); assert.doesNotThrow(() => c.startAttempt("guide"));
  await new Promise(resolve => setImmediate(resolve));
});
test("versioned preference contains no identifier and expires after 180 days; blocked storage fails safely", () => {
  const map = new Map<string, string>(); const storage = { getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => { map.set(k, v); } };
  assert.equal(readConsent(storage, 100), null); assert.equal(saveConsent(storage, "denied", 100), true);
  assert.deepEqual(JSON.parse(map.get(CONSENT_KEY)!), { version: 1, choice: "denied", at: 100 });
  assert.equal(readConsent(storage, 101), "denied"); assert.equal(readConsent(storage, 100 + 180 * 86400000), null);
  assert.equal(readConsent({ getItem() { throw new Error(); } }), null); assert.equal(saveConsent({ setItem() { throw new Error(); } }, "denied"), false);
});
