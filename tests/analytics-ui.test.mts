/* eslint-disable @typescript-eslint/no-explicit-any -- Isolated React/DOM harness; no network or additional test dependencies. */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as module from "../src/lib/analytics.ts";
import { ETFS } from "../src/data/etfs.ts";
import { compareInvestments, INVESTMENT_LIMITS } from "../src/lib/investment.ts";

const nodes = (tree: any): any[] => !tree || typeof tree !== "object" ? [] : Array.isArray(tree) ? tree.flatMap(nodes) : [tree, ...nodes(tree.props?.children)];
function harness({ enabled = true, hostname = module.ANALYTICS_HOST, stored = null as string | null, storageBroken = false, broadcastHub = undefined as Set<any> | undefined } = {}) {
  const controller = module.createAnalyticsController(), sent: any[] = [], values: any[] = [], effects: (() => void)[] = [];
  const storage = new Map<string, string>(); if (stored) storage.set(module.CONSENT_KEY, stored);
  let index = 0, tree: any, reloads = 0;
  let writesBlocked = storageBroken;
  const events = new Map<string, any>();
  const window: any = {
    location: { hostname, href: `https://${hostname}/?utm_content=ad_a&email=private@example.com`, pathname: "/", search: "?utm_content=ad_a&email=private@example.com", hash: "", reload() { reloads++; } },
    history: { replaceState(_data: unknown, _unused: unknown, url: string) { window.location.hash = new URL(url, `https://${hostname}`).hash; } },
    localStorage: { getItem: (key: string) => storage.get(key) ?? null, setItem(key: string, value: string) { if (writesBlocked) throw new Error("blocked"); storage.set(key, value); }, removeItem(key: string) { if (writesBlocked) throw new Error("blocked"); storage.delete(key); } },
    addEventListener: (name: string, cb: any) => events.set(name, cb), removeEventListener: (name: string) => events.delete(name),
    setInterval: () => 1, clearInterval() {}, scrollTo() {}, umami: { track: (payload: any) => { sent.push(payload); } },
  };
  const hub = broadcastHub ?? new Set<any>();
  if (broadcastHub) window.BroadcastChannel = class {
    onmessage: any;
    constructor() { hub.add(this); }
    postMessage(data: unknown) { for (const peer of hub) if (peer !== this) queueMicrotask(() => peer.onmessage?.({data})); }
    close() { hub.delete(this); }
  };
  const react = {
    useState(initial: any) { const i = index++; if (!(i in values)) values[i] = initial; return [values[i], (v: any) => { values[i] = v; }]; },
    useRef(initial: any) { const i = index++; return values[i] ?? (values[i] = { current: initial }); },
    useEffect(effect: any, deps: any[]) { const i = index++, previous = values[i]; if (!previous || deps.some((v, j) => v !== previous.deps[j])) effects.push(() => { previous?.cleanup?.(); values[i] = { deps, cleanup: effect() }; }); },
  };
  const code = ts.transpileModule(readFileSync(new URL("../src/components/analytics-provider.tsx", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const exports: any = {};
  vm.runInNewContext(code, { exports, window, document: { referrer: "https://www.facebook.com/private" }, queueMicrotask,
    require: (name: string) => {
      if (name === "react") return react;
      if (name === "react/jsx-runtime") return { jsx: (type: any, props: any) => ({ type, props }), jsxs: (type: any, props: any) => ({ type, props }) };
      if (name === "next/navigation") return { usePathname: () => "/" };
      if (name === "next/script") return { default: "script" };
      if (name === "next/link") return { default: "a" };
      if (name === "@/lib/analytics") return { ...module, analytics: controller };
      throw new Error("unexpected dependency");
    },
  });
  const render = () => {
    index = 0; effects.length = 0; tree = exports.AnalyticsProvider({ enabled, children: "application" });
    for (const n of nodes(tree)) if (n.props?.ref && !n.props.ref.current) n.props.ref.current = { focus() {} };
    effects.splice(0).forEach(effect => effect()); return tree;
  };
  const button = (name: string) => nodes(tree).find(n => n.type === "button" && n.props.children === name);
  return { render, button, nodes: () => nodes(tree), window, controller, sent, events, reloads: () => reloads, storage, blockWrites: () => { writesBlocked = true; }, allowWrites: () => { writesBlocked = false; } };
}
const settle = () => new Promise(resolve => setImmediate(resolve));

test("consent UI never mounts script before opt-in or on refusal; grant, revoke, and same-page hook work", async () => {
  const h = harness(); h.render(); await settle(); h.render();
  assert.equal(h.nodes().filter(n => n.type === "script").length, 0);
  assert.ok(h.button("Povolit analytiku")); assert.ok(h.button("Odmítnout"));
  h.button("Odmítnout").props.onClick(); h.render();
  assert.equal(h.nodes().filter(n => n.type === "script").length, 0); assert.equal(h.controller.hasConsent(), false);
  h.button("Nastavení analytiky").props.onClick(); h.render(); h.button("Povolit analytiku").props.onClick(); h.render();
  const script = h.nodes().find(n => n.type === "script"); assert.ok(script);
  assert.equal(script.props["data-auto-track"], "false"); assert.equal(script.props.referrerPolicy, "no-referrer");
  assert.equal(typeof h.window.etfAnalyticsBeforeSend, "function");
  script.props.onReady(); assert.equal(h.sent.length, 2);
  h.render(); script.props.onReady(); assert.equal(h.sent.length, 2);
  h.button("Nastavení analytiky").props.onClick(); h.render(); h.button("Odmítnout").props.onClick(); h.render();
  assert.equal(h.controller.hasConsent(), false); assert.equal(h.reloads(), 1);
  assert.equal(h.window.etfAnalyticsBeforeSend("event", { website: module.UMAMI_WEBSITE_ID }), false);
  assert.equal(h.nodes().filter(n => n.type === "script").length, 0);
});
test("production build and exact production host are both required", async () => {
  for (const options of [{ enabled: false }, { hostname: "localhost" }, { hostname: "preview.vercel.app" }]) {
    const h = harness(options); h.render(); await settle(); h.render(); h.button("Povolit analytiku").props.onClick(); h.render();
    assert.equal(h.nodes().filter(n => n.type === "script").length, 0); assert.equal(h.controller.hasConsent(), false);
  }
});
test("audit regression: old grant, failed denial, reload, fragment change, recovered storage and focus never regrant", async () => {
  const stored = JSON.stringify({ version: 1, choice: "granted", at: Date.now() });
  const h = harness({ stored, storageBroken: true }); h.render(); await settle(); h.render();
  assert.equal(h.nodes().filter(n => n.type === "script").length, 0);
  h.button("Povolit analytiku").props.onClick(); h.render();
  assert.equal(h.nodes().filter(n => n.type === "script").length, 1);
  h.button("Nastavení analytiky").props.onClick(); h.render(); h.button("Odmítnout").props.onClick(); h.render();
  assert.equal(h.controller.hasConsent(), false); assert.equal(h.reloads(), 0);
  assert.ok(JSON.stringify(h.nodes()).includes("nepodařilo trvale"));
  const next = harness({ stored: h.storage.get(module.CONSENT_KEY)!, storageBroken: true });
  next.render(); await settle(); next.render();
  next.window.location.hash = "#kalkulacka"; next.allowWrites(); next.events.get("focus")(); next.render();
  assert.equal(next.controller.hasConsent(), false); assert.equal(next.nodes().filter(n => n.type === "script").length, 0);
  // Recovery in the original document cannot revive a stale grant either.
  h.window.location.hash = "#pruvodce"; h.allowWrites(); h.events.get("focus")(); h.render();
  assert.equal(h.controller.hasConsent(), false);
  // Only a fresh explicit opt-in can enable it.
  next.button("Povolit analytiku").props.onClick(); next.render(); assert.equal(next.controller.hasConsent(), true);
});

test("storage revocation from another tab closes gate; a stored grant never enables another document", async () => {
  const h = harness(); h.render(); await settle(); h.render(); h.button("Povolit analytiku").props.onClick(); h.render();
  h.storage.set(module.CONSENT_KEY, JSON.stringify({ version: 1, choice: "denied", at: Date.now() }));
  h.events.get("storage")({ key: module.CONSENT_KEY }); assert.equal(h.controller.hasConsent(), false); assert.equal(h.reloads(), 1);
  const other = harness({stored:JSON.stringify({version:1,choice:"granted",at:Date.now()})}); other.render(); await settle(); other.render();
  assert.equal(other.controller.hasConsent(),false);
});

test("BroadcastChannel revokes two explicitly granted tabs even when denial cannot be persisted", async () => {
  const hub = new Set<any>(), first = harness({broadcastHub:hub}), second = harness({broadcastHub:hub});
  for(const h of [first,second]) {h.render();await settle();h.render();h.button("Povolit analytiku").props.onClick();h.render();h.blockWrites();}
  first.button("Nastavení analytiky").props.onClick();first.render();first.button("Odmítnout").props.onClick();
  await settle();second.render();
  assert.equal(first.controller.hasConsent(),false);assert.equal(second.controller.hasConsent(),false);
  second.allowWrites();second.events.get("focus")();second.render();assert.equal(second.controller.hasConsent(),false);
});

test("BFCache pagehide closes the gate before suspension; pageshow requires fresh opt-in", async () => {
  const h = harness(); h.render(); await settle(); h.render();
  h.button("Povolit analytiku").props.onClick(); h.render(); assert.equal(h.controller.hasConsent(), true);
  h.events.get("pagehide")(); assert.equal(h.controller.hasConsent(), false);
  assert.equal(h.window.etfAnalyticsBeforeSend("event", { website: module.UMAMI_WEBSITE_ID }), false);
  h.events.get("pageshow")({ persisted: true }); h.render();
  assert.equal(h.nodes().filter(n => n.type === "script").length, 0);
  assert.ok(h.button("Povolit analytiku"));
});

test("real route observer detects query-only ad_a → ad_b navigation and invalidates pending completion", () => {
  const controller = module.createAnalyticsController(), sent: any[] = [];
  const window = { location: new URL(`https://${module.ANALYTICS_HOST}/?utm_content=ad_a`) };
  let previous: unknown[] | undefined;
  const effects: (() => void)[] = [], exports: any = {};
  const code = ts.transpileModule(readFileSync(new URL("../src/components/analytics-provider.tsx", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  vm.runInNewContext(code, { exports, window, document: { referrer: "" }, require: (name: string) => {
    if (name === "react") return { useEffect: (effect: () => void, deps: unknown[]) => { if (!previous || deps.some((d, i) => d !== previous![i])) effects.push(effect); previous = deps; } };
    if (name === "next/navigation") return { usePathname: () => window.location.pathname, useSearchParams: () => window.location.searchParams };
    if (name === "@/lib/analytics") return { ...module, analytics: controller };
    if (["next/script", "next/link", "react/jsx-runtime"].includes(name)) return {};
    throw new Error("unexpected dependency");
  } });
  const render = () => { exports.AnalyticsRouteObserver({ enabled: true }); effects.splice(0).forEach(effect => effect()); };
  controller.setConsent(true, true); controller.ready(p => sent.push(p)); render();
  controller.track({ name: "form_view", material: "report" }); const attempt = controller.startAttempt("report");
  window.location = new URL(`https://${module.ANALYTICS_HOST}/?utm_content=ad_b`); render();
  controller.track({ name: "form_view", material: "report" }); controller.finishAttempt(attempt);
  assert.equal(sent.filter(p => p.name === "landing_view").at(-1)?.data?.ad_variant, "ad_b");
  assert.equal(sent.filter(p => p.name === "material_accepted").length, 0);
  render(); assert.equal(sent.filter(p => !p.name).length, 2);
});

test("calculator works with denied consent; only completed changed values and real ETF changes emit", () => {
  const controller = module.createAnalyticsController(), sent: any[] = [], values: any[] = []; let index = 0;
  const exports: any = {}, jsx = (type: any, props: any) => ({ type, props });
  const code = ts.transpileModule(readFileSync(new URL("../src/components/calculator.tsx", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  vm.runInNewContext(code, { exports, require: (name: string) => {
    if (name === "react") return { useState(initial: any) { const i = index++; if (!(i in values)) values[i] = initial; return [values[i], (v: any) => { values[i] = v; }]; }, useRef(initial: any) { const i = index++; return values[i] ?? (values[i] = { current: initial }); } };
    if (name === "react/jsx-runtime") return { jsx, jsxs: jsx };
    if (name === "@/lib/analytics") return { analytics: controller, trackAnalytics: (event: any) => controller.track(event) };
    if (name === "@/data/etfs") return { ETFS };
    if (name === "@/lib/investment") return { compareInvestments, INVESTMENT_LIMITS };
    if (name === "./email-form") return { EmailForm: "email-form" }; throw new Error("unexpected dependency");
  } });
  const render = () => { index = 0; return exports.Calculator({ delivery: { enabled: false, siteKey: "" } }); };
  let tree = render(); const field = (id: string) => nodes(tree).find(n => n.props?.id === id);
  field("monthly-amount").props.onChange({ target: { value: "10000" } }); tree = render(); field("monthly-amount").props.onBlur();
  assert.ok(JSON.stringify(tree).includes("45")); assert.equal(sent.length, 0);
  controller.setConsent(true, true); controller.enter({ pathname: "/", href: "https://example.com", referrer: "" }); controller.ready(p => sent.push(p));
  field("monthly-amount").props.onChange({ target: { value: "600" } }); tree = render();
  field("monthly-amount").props.onChange({ target: { value: "6000" } }); tree = render();
  assert.equal(sent.filter(p => p.name === "calculator_change").length, 0);
  field("monthly-amount").props.onBlur(); field("monthly-amount").props.onBlur();
  assert.equal(sent.filter(p => p.name === "calculator_change").length, 1);
  field("second-fund").props.onChange({ target: { value: "SPY" } }); tree = render();
  field("second-fund").props.onChange({ target: { value: "SPY" } });
  assert.equal(sent.filter(p => p.name === "etf_change").length, 1);
  assert.ok(!JSON.stringify(sent).includes("6000"));
});
