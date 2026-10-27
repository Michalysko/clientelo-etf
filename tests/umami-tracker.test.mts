/* eslint-disable @typescript-eslint/no-explicit-any -- Execute the actual downloaded vendor script only in an isolated VM with fake browser/network. */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { createAnalyticsController, ANALYTICS_HOST, UMAMI_WEBSITE_ID } from "../src/lib/analytics.ts";

test("actual Umami tracker: manual mode, synchronous firewall, withdrawal, metadata and transport contract", { skip: !process.env.UMAMI_TRACKER_TEST_FILE }, async () => {
  const source = readFileSync(process.env.UMAMI_TRACKER_TEST_FILE!, "utf8");
  const controller = createAnalyticsController(), requests: any[] = [], storageReads: string[] = [];
  const attrs: Record<string, string> = { "data-website-id": UMAMI_WEBSITE_ID, "data-auto-track": "false", "data-auto-pageview": "false", "data-performance": "false", "data-before-send": "etfAnalyticsBeforeSend", "data-domains": ANALYTICS_HOST, "data-exclude-hash": "true" };
  const window: any = {
    screen: { width: 999, height: 888 }, navigator: { language: "private-language" },
    location: new URL(`https://${ANALYTICS_HOST}/?utm_content=ad_a&email=private@example.com#private`),
    document: { currentScript: { getAttribute: (key: string) => attrs[key] ?? null }, referrer: "https://www.facebook.com/private?email=private@example.com", title: "private-title", readyState: "complete", addEventListener() { throw new Error("automatic listeners must be disabled"); } },
    history: {}, localStorage: { getItem: (key: string) => { storageReads.push(key); return null; } },
    etfAnalyticsBeforeSend: (type: string, payload: unknown) => controller.beforeSend(type, payload),
  };
  vm.runInNewContext(source, { window, URL, fetch: async (url: string, options: any) => { requests.push({ url, ...options, body: JSON.parse(options.body) }); return { json: async () => ({ cache: "mock-only-cache" }) }; } });
  const settle = () => new Promise(resolve => setImmediate(resolve));
  await settle(); assert.equal(requests.length, 0);
  // Even a direct vendor call remains blocked before consent by our hook.
  await window.umami.track(); assert.equal(requests.length, 0);
  controller.setConsent(true, true); controller.enter({ pathname: "/", href: window.location.href, referrer: window.document.referrer });
  controller.ready(payload => window.umami.track(payload)); await settle();
  assert.equal(requests.length, 2); assert.equal(requests.filter(r => !r.body.payload.name).length, 1);
  assert.ok(storageReads.includes("umami.disabled"));
  assert.ok(requests.every(r => r.url === "https://gateway.umami.is/api/send" && r.credentials === "omit"));
  assert.ok(!JSON.stringify(requests).includes("private"));
  assert.ok(requests.every(r => !Object.hasOwn(r.body.payload, "screen") && !Object.hasOwn(r.body.payload, "language") && !Object.hasOwn(r.body.payload, "id")));
  controller.setConsent(false, false); const count = requests.length;
  await window.umami.track(); await window.umami.track("form_start", { material: "report", ad_variant: "ad_a" }); await settle();
  assert.equal(requests.length, count);
});
