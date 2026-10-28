import test from "node:test";
import assert from "node:assert/strict";
import { readDeliveryConfig, readDemoAllowedEmails, isDemoRecipientAllowed, publicDeliveryConfig } from "../src/lib/email/config.ts";
import { createDeliveryHandler } from "../src/lib/email/handler.ts";

// Reserved example domains only. No .env loading or real provider calls.
const env = { RESEND_API_KEY: "fake-only", RESEND_FROM_EMAIL: "unit@etf.michalwebdeveloper.cz", TURNSTILE_SECRET_KEY: "fake-only", NEXT_PUBLIC_TURNSTILE_SITE_KEY: "fake-only", APP_ORIGIN: "https://example.com", DEMO_ALLOWED_EMAILS: "reader@example.com,owner@example.com" };
const scenario = { firstTicker: "SPY", secondTicker: "SPYM", monthlyContribution: 5000, years: 20, grossAnnualReturnPercent: 7, initialInvestment: 0 };
const requestId = "12345678-1234-4234-8234-123456789abc";
function request(material: "guide" | "report", email: string, extra = {}) {
  return new Request(`https://example.com/api/materials/${material}`, { method: "POST", headers: { origin: env.APP_ORIGIN, "content-type": "application/json" }, body: JSON.stringify({ requestId, email, website: "", turnstileToken: "fake-token", ...(material === "report" ? { scenario } : {}), ...extra }) });
}

test("demo config requires exactly two distinct valid addresses; never partly accepts a broken list", () => {
  for (const raw of [undefined, "", " ", "reader@example.com", "reader@example.com,", ",owner@example.com", "reader@example.com,bad", "reader@example.com,owner@example.com,third@example.com", "reader@example.com,reader@EXAMPLE.COM", "reader@example.com\r\n,owner@example.com", "Name <reader@example.com>,owner@example.com", "*@example.com,owner@example.com"]) {
    assert.throws(() => readDemoAllowedEmails(raw));
    assert.throws(() => readDeliveryConfig({ ...env, DEMO_ALLOWED_EMAILS: raw }));
    assert.deepEqual(publicDeliveryConfig({ ...env, DEMO_ALLOWED_EMAILS: raw }), { enabled: false, siteKey: "" });
  }
});

test("demo matching trims configuration, folds domains only, and never accepts aliases or wildcards", () => {
  const allowed = readDemoAllowedEmails(" reader@EXAMPLE.COM , owner@example.com ");
  assert.equal(isDemoRecipientAllowed("reader@example.com", allowed), true);
  assert.equal(isDemoRecipientAllowed("owner@EXAMPLE.COM", allowed), true);
  for (const email of ["Reader@example.com", "reader+alias@example.com", "rea.der@example.com", "third@example.com", "reader@example.com.evil", "bad"]) assert.equal(isDemoRecipientAllowed(email, allowed), false);
  const visible = publicDeliveryConfig(env);
  assert.deepEqual(visible, { enabled: true, siteKey: env.NEXT_PUBLIC_TURNSTILE_SITE_KEY });
  assert.ok(!JSON.stringify(visible).includes("@"));
});

for (const material of ["report", "guide"] as const) {
  test(`${material}: direct API allows both configured recipients and blocks all others before material/provider access`, async () => {
    let verified = 0, sent = 0, pdfReads = 0;
    const logs: unknown[] = [];
    const handler = createDeliveryHandler(material, {
      config: () => readDeliveryConfig(env), verify: async () => { verified++; return true; },
      send: async () => { sent++; }, guide: async () => { pdfReads++; return Buffer.from("%PDF-test"); }, log: entry => { logs.push(entry); },
    });
    const denied = await handler(request(material, "outsider@example.com"));
    assert.equal(denied.status, 403);
    assert.equal(denied.headers.get("Cache-Control"), "no-store");
    const body = await denied.json(); assert.equal(body.code, "demo_not_allowed"); assert.equal(body.status, "error");
    for (const email of ["reader@example.com", "owner@example.com", "outsider@example.com"]) assert.ok(!JSON.stringify(body).includes(email));
    assert.equal(verified, 1); assert.equal(sent, 0); assert.equal(pdfReads, 0); assert.deepEqual(logs, []);
    for (const email of [" reader@EXAMPLE.COM ", "owner@example.com"]) assert.equal((await handler(request(material, email))).status, 202);
    assert.equal(sent, 2); assert.equal(pdfReads, material === "guide" ? 2 : 0);
    assert.equal((await handler(request(material, "outsider@example.com", { demoAllowedEmails: ["outsider@example.com"], bypass: true }))).status, 400);
    assert.equal(sent, 2);
  });

  test(`${material}: absent/broken runtime config fails closed without leaking configuration`, async () => {
    for (const raw of [undefined, "", "reader@example.com,bad"]) {
      let touched = false; const logs: unknown[] = [];
      const handler = createDeliveryHandler(material, {
        config: () => readDeliveryConfig({ ...env, DEMO_ALLOWED_EMAILS: raw }),
        verify: async () => { touched = true; return true; }, send: async () => { touched = true; }, guide: async () => { touched = true; return Buffer.from("%PDF-test"); }, log: entry => { logs.push(entry); },
      });
      const response = await handler(request(material, "reader@example.com"));
      assert.equal(response.status, 503); assert.equal(touched, false);
      assert.deepEqual(logs, [{ material, phase: "configuration", code: "unavailable" }]);
      assert.ok(!JSON.stringify([logs, await response.json()]).includes("@"));
    }
  });

  test(`${material}: allowlist cannot bypass Turnstile, honeypot, UUID or origin checks`, async () => {
    let sent = 0, verified = 0;
    const handler = createDeliveryHandler(material, {
      config: () => readDeliveryConfig(env), verify: async () => { verified++; return false; }, send: async () => { sent++; }, guide: async () => { assert.fail("must not read PDF"); }, log: () => {},
    });
    for (const email of ["reader@example.com", "outsider@example.com"]) {
      const response = await handler(request(material, email));
      assert.equal(response.status, 403); assert.equal((await response.json()).code, undefined);
    }
    assert.equal((await handler(request(material, "reader@example.com", { website: "spam" }))).status, 400);
    assert.equal((await handler(request(material, "reader@example.com", { requestId: "bad" }))).status, 400);
    const crossSite = request(material, "reader@example.com"); crossSite.headers.set("origin", "https://evil.example");
    assert.equal((await handler(crossSite)).status, 403);
    assert.equal(verified, 2); assert.equal(sent, 0);
  });
}
