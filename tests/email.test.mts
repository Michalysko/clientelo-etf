import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { validEmail, validateMaterialRequest, calculateReport } from "../src/lib/email/validation.ts";
import { createReport, createGuideEmail, escapeHtml } from "../src/lib/email/content.ts";
import { createDeliveryHandler, MAX_REQUEST_BYTES } from "../src/lib/email/handler.ts";
import { readDeliveryConfig } from "../src/lib/email/config.ts";
import { DeliveryError, sendResend, verifyTurnstile, resendIdempotencyKey } from "../src/lib/email/providers.ts";
import { compareInvestments } from "../src/lib/investment.ts";

// Explicit fakes only. Never load .env.local or call a provider in this suite.
const config = {apiKey: "unit-test-only", from: "ETF Kompas <unit@etf.michalwebdeveloper.cz>", turnstileSecret: "unit-test-only", siteKey: "unit-test-only", origin: "https://example.com", demoAllowedEmails: ["reader@example.com", "owner@example.com"]};
const scenario = {firstTicker: "SPY", secondTicker: "SPYM", monthlyContribution: 5000, years: 20, grossAnnualReturnPercent: 7, initialInvestment: 0 as const};
const requestId = "12345678-1234-4234-8234-123456789abc";
const payload = {requestId, email: "reader@example.com", website: "", turnstileToken: "unit-token", scenario};
function request(body: unknown = payload, headers: Record<string, string> = {}) {
  return new Request("https://example.com/api/materials/report", {method: "POST", headers: {origin: config.origin, "Content-Type": "application/json", ...headers}, body: JSON.stringify(body)});
}
function harness(overrides: Record<string, unknown> = {}, kind: "report" | "guide" = "report") {
  const sent: unknown[] = [];
  let verified = 0;
  const handler = createDeliveryHandler(kind, {
    config: () => config,
    verify: async () => { verified++; return true; },
    send: async (_config, email) => { sent.push(email); },
    guide: async () => Buffer.from("%PDF-unit-test"),
    log: () => {},
    ...overrides,
  });
  return {handler, sent, verified: () => verified};
}

test("email validation rejects injection, multiple recipients and malformed addresses", () => {
  for (const email of ["", "a", "a@@example.com", "x\r\nBcc:x@example.com", "Name <x@example.com>", "a@example.com,b@example.com", ".a@example.com", "a..b@example.com", "a@-example.com", "a@example..com", "a".repeat(65) + "@example.com", 123, null]) assert.equal(validEmail(email), false);
  assert.equal(validEmail("reader+guide@example.com"), true);
});
test("strict validation rejects browser results, unauthorized tickers and nonzero initial investment", () => {
  for (const invalid of [{...payload, finalValue: 999999}, {...payload, scenario:{...scenario, annualExpenseRatioPercent:0}}, {...payload, scenario:{...scenario, firstTicker:"SPLG"}}, {...payload, scenario:{...scenario, initialInvestment:1}}, {...payload, scenario:{...scenario, monthlyContribution:"5000"}}, {...payload, scenario:{...scenario, years:1.5}}, {...payload, scenario:{...scenario, grossAnnualReturnPercent:-100}}, {...payload, scenario:{...scenario, years:100, grossAnnualReturnPercent:100, monthlyContribution:1e9}}]) assert.throws(() => validateMaterialRequest("report",invalid));
  assert.equal(validateMaterialRequest("report", {...payload,email:" reader@example.com "}).email, "reader@example.com");
});
test("honeypot and overlong/empty Turnstile token are rejected", () => {
  for (const body of [{...payload, website:"spam"},{...payload, turnstileToken:""},{...payload, turnstileToken:"a".repeat(2049)}]) assert.throws(() => validateMaterialRequest("report",body));
});
test("guide accepts only its own contract", () => {
  const guide = {requestId,email:payload.email,website:"",turnstileToken:payload.turnstileToken};
  assert.equal(validateMaterialRequest("guide",guide).scenario, undefined);
  assert.throws(() => validateMaterialRequest("guide",payload));
});
test("server calculation exactly matches existing model and source costs", () => {
  assert.deepEqual(calculateReport(scenario).comparison, compareInvestments(scenario,[0.0945,0.02]));
  const same = calculateReport({...scenario,secondTicker:"SPY"}).comparison;
  assert.equal(same.finalValueDifference,0);
});
test("report includes complete scenario, annual rows, sources, methods and risks", () => {
  const email = createReport(scenario);
  for (const needle of ["Počáteční investice", "5 000", "20 let", "7 %", "0,0945 %", "0,02 %", "1 200 000", "2 508 738", "2 531 525", "22 787", "PRIIPs/KID", "konci každého měsíce", "ssga.com", "2026-10-26", "daně", "inflaci", "kurzů"]) assert.ok(email.text.includes(needle),needle);
  assert.equal((email.html.match(/<tbody>([\s\S]*?)<\/tbody>/)?.[1].match(/<tr>/g) ?? []).length,21);
  assert.ok(email.html.includes('lang="cs"'));
  assert.ok(email.html.includes("max-width:620px"));
  assert.ok(!email.html.includes(payload.email));
  assert.ok(!email.html.includes("<script"));
  for (const content of [email.html,email.text]) assert.ok(content.includes("nikoli o částku skutečně zaplacených poplatků"));
});
test("HTML escaping and text alternatives are present", () => {
  assert.equal(escapeHtml('<b>&"\''), "&lt;b&gt;&amp;&quot;&#39;");
  assert.ok(createGuideEmail().text.includes("sedmistránkový"));
  assert.ok(createGuideEmail().html.includes("příloze"));
});
test("zero-year and maximum-year reports remain deterministic and finite", () => {
  assert.deepEqual(createReport(scenario),createReport(scenario));
  assert.ok(createReport({...scenario,years:0}).text.includes("0 Kč"));
  const content=createReport({...scenario,years:100,grossAnnualReturnPercent:0});
  assert.ok(!content.html.includes("NaN"));
  assert.ok(Buffer.byteLength(content.html)<100_000);
});
test("handler returns accepted only after the mocked service resolves", async () => {
  let complete!: () => void;
  const pending = new Promise<void>((resolve)=>{complete=resolve;});
  const {handler,sent}=harness({send:async (...args: unknown[])=>{sent.push(args);await pending;}});
  let settled=false;
  const response=handler(request()).then((value)=>{settled=true;return value;});
  await new Promise((resolve)=>setTimeout(resolve,10));
  assert.equal(settled,false); complete();
  assert.equal((await response).status,202);
  assert.equal(sent.length,1);
});
test("guide is a private PDF attachment, no public download URL", async () => {
  const h=harness({},"guide");
  const response=await h.handler(request({requestId,email:payload.email,website:"",turnstileToken:"unit-token"}));
  assert.equal(response.status,202);
  assert.ok(Buffer.isBuffer((h.sent[0] as {attachment:Buffer}).attachment));
  assert.ok(!(await response.text()).includes(".pdf"));
});
test("GET, bad origin and cross-site requests never contact services", async () => {
  const h=harness();
  assert.equal((await h.handler(new Request("https://example.com/api/materials/report"))).status,405);
  assert.equal((await h.handler(request(payload,{origin:"https://evil.example"}))).status,403);
  assert.equal((await h.handler(request(payload,{"sec-fetch-site":"cross-site"}))).status,403);
  assert.equal(h.verified(),0); assert.equal(h.sent.length,0);
});
test("body byte limit is enforced with and without honest Content-Length", async () => {
  const h=harness();
  const headerCases: Record<string,string>[] = [{"content-length":String(MAX_REQUEST_BYTES+1)},{"content-length":"1"},{}];
  for (const headers of headerCases) {
    const response=await h.handler(request({...payload,website:"č".repeat(MAX_REQUEST_BYTES)},headers));
    assert.equal(response.status,413);
  }
  assert.equal(h.verified(),0);
});
test("non-JSON, malformed JSON and invalid UTF-8 never send", async () => {
  const h=harness();
  assert.equal((await h.handler(request(payload,{"Content-Type":"text/plain"}))).status,415);
  for (const body of ["{",new Uint8Array([0xff,0xfe])]) {
    const req=new Request("https://example.com/api/materials/report",{method:"POST",headers:{origin:config.origin,"Content-Type":"application/json"},body});
    assert.equal((await h.handler(req)).status,400);
  }
  assert.equal(h.sent.length,0);
});
test("invalid inputs and honeypot stop before Turnstile", async () => {
  const h=harness();
  assert.equal((await h.handler(request({...payload,website:"bot"}))).status,400);
  assert.equal((await h.handler(request({...payload,email:"not an email"}))).status,400);
  assert.equal(h.verified(),0);
});
test("failed or expired verification blocks sending", async () => {
  const h=harness({verify:async()=>false});
  assert.equal((await h.handler(request())).status,403);
  assert.equal(h.sent.length,0);
});
test("configuration failure, provider failure and timeout do not leak internals", async () => {
  for (const overrides of [{config:()=>{throw new Error("private configuration");}},{verify:async()=>{throw new Error(payload.email);}},{send:async()=>{throw new Error("provider secret");}}]) {
    const response=await harness(overrides).handler(request());
    assert.equal(response.status,503);
    const body=await response.text();
    for (const secret of [payload.email,"private configuration","provider secret",config.apiKey]) assert.ok(!body.includes(secret));
    assert.equal(response.headers.get("Cache-Control"),"no-store");
  }
});
test("provider throttling and missing/oversize PDF fail safely", async () => {
  const throttled=await harness({send:async()=>{throw new DeliveryError(429);}}).handler(request());
  assert.equal(throttled.status,429); assert.equal(throttled.headers.get("Retry-After"),"60");
  for (const guide of [async()=>{throw new Error("private path");},async()=>Buffer.from("not a PDF"),async()=>Buffer.alloc(2*1024*1024+1)]) {
    const h=harness({guide},"guide");
    assert.equal((await h.handler(request({requestId,email:payload.email,website:"",turnstileToken:"unit-token"}))).status,503);
    assert.equal(h.sent.length,0);
  }
});
test("Turnstile verifies success, exact hostname and action using mocked fetch", async () => {
  for (const data of [{success:true,hostname:"example.com",action:"report"},{success:false,hostname:"example.com",action:"report"},{success:true,hostname:"evil.example",action:"report"},{success:true,hostname:"example.com",action:"guide"}]) {
    const mock: typeof fetch = async()=>Response.json(data);
    assert.equal(await verifyTurnstile(config,"unit-token","report",mock),data.success && data.hostname==="example.com" && data.action==="report");
  }
});

test("both material handlers fail closed before sending for invalid input or verification failure", async () => {
  for (const kind of ["report","guide"] as const) {
    const input=kind === "report" ? payload : {requestId,email:payload.email,website:"",turnstileToken:payload.turnstileToken};
    for (const invalid of [{...input,email:""},{...input,email:"not-an-email"},{...input,website:"bot"},{...input,turnstileToken:""}]) {
      const h=harness({},kind);assert.equal((await h.handler(request(invalid))).status,400);
      assert.equal(h.verified(),0);assert.equal(h.sent.length,0);
    }
    for (const verify of [async()=>false,async()=>{throw new Error("synthetic outage");}]) {
      const h=harness({verify},kind),response=await h.handler(request(input));
      assert.ok([403,503].includes(response.status));assert.equal(h.sent.length,0);
      assert.notEqual((await response.json()).status,"accepted");
    }
  }
});
test("Resend adapter uses multipart alternatives, attachment and deterministic private idempotency", async () => {
  const email={...createGuideEmail(),requestId,material:"guide" as const,to:payload.email,attachment:Buffer.from("%PDF-test")};
  let calls=0;
  const mock: typeof fetch=async(url,init)=>{
    calls++; assert.equal(url,"https://api.resend.com/emails");
    const headers=init!.headers as Record<string,string>;
    assert.equal(headers["Idempotency-Key"],resendIdempotencyKey(config,email));
    assert.ok(!headers["Idempotency-Key"].includes(payload.email));
    const data=JSON.parse(init!.body as string);
    assert.equal(data.to[0],payload.email); assert.ok(data.html); assert.ok(data.text);
    assert.equal(Buffer.from(data.attachments[0].content,"base64").toString(),"%PDF-test");
    return Response.json({id:"unit-id"});
  };
  await sendResend(config,email,mock); assert.equal(calls,1);
  assert.equal(resendIdempotencyKey(config,email),resendIdempotencyKey(config,{...email}));
  assert.equal(resendIdempotencyKey(config,email),resendIdempotencyKey(config,{...email,to:"other@example.com"}));
  assert.equal(resendIdempotencyKey(config,email),resendIdempotencyKey(config,{...email,text:"changed"}));
  assert.equal(resendIdempotencyKey(config,email),resendIdempotencyKey(config,{...email,attachment:Buffer.from("%PDF-updated")}));
});
test("Resend adapter rejects missing acknowledgement, errors and network failures", async () => {
  const email={...createGuideEmail(),requestId,material:"guide" as const,to:payload.email};
  for (const mock of [async()=>Response.json({}),async()=>new Response("provider details",{status:500}),async()=>{throw new Error("network");}]) await assert.rejects(()=>sendResend(config,email,mock));
});
test("configuration requires protection and approved sender; no test-key bypass", () => {
  assert.throws(()=>readDeliveryConfig({}));
  const env={RESEND_API_KEY:config.apiKey,RESEND_FROM_EMAIL:config.from,TURNSTILE_SECRET_KEY:config.turnstileSecret,NEXT_PUBLIC_TURNSTILE_SITE_KEY:config.siteKey,APP_ORIGIN:config.origin,DEMO_ALLOWED_EMAILS:config.demoAllowedEmails.join(",")};
  assert.equal(readDeliveryConfig(env).origin,config.origin);
  assert.throws(()=>readDeliveryConfig({...env,RESEND_FROM_EMAIL:"unit@other.example"}));
  assert.throws(()=>readDeliveryConfig({...env,APP_ORIGIN:"https://example.com/private"}));
  assert.throws(()=>readDeliveryConfig({...env,TURNSTILE_SECRET_KEY:""}));
  // A similarly named variable must not silently enable delivery without the required site key.
  assert.throws(()=>readDeliveryConfig({...env,NEXT_PUBLIC_TURNSTILE_SITE_KEY:undefined,NEXT_PUBLIC_TURNSTILE_API_KEY:config.siteKey}));
  assert.throws(()=>readDeliveryConfig({...env,NEXT_PUBLIC_TURNSTILE_SITE_KEY:"1x"+"0".repeat(20)}));
});
test("committed guide exists outside public and is small enough for attachment", async () => {
  const pdf=await readFile(new URL("../output/pdf/etf-od-nuly.pdf",import.meta.url));
  assert.equal(pdf.subarray(0,5).toString(),"%PDF-");
  assert.ok(pdf.length<2*1024*1024);
});
