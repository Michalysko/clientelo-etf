import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as privacy from "../src/lib/privacy.ts";

test("public privacy contact never falls back to delivery credentials and rejects invalid values", () => {
  assert.equal(privacy.getPrivacyContact({}),null);
  assert.equal(privacy.getPrivacyContact({RESEND_FROM_EMAIL:"sender@example.com"}),null);
  for (const value of ["", "invalid", "Name <a@example.com>", "a@example.com\r\nBcc: b@example.com", "mailto:a@example.com"]) {
    assert.equal(privacy.getPrivacyContact({PRIVACY_CONTACT_EMAIL:value}),null);
  }
  assert.deepEqual(privacy.getPrivacyContact({PRIVACY_CONTACT_EMAIL:" contact@example.com "}),{email:"contact@example.com",href:"mailto:contact%40example.com"});
  assert.equal(privacy.getPrivacyContact({PRIVACY_CONTACT_EMAIL:"a?subject=x@example.com"})?.href,"mailto:a%3Fsubject%3Dx%40example.com");
});

function renderPrivacy(contact: ReturnType<typeof privacy.getPrivacyContact>) {
  const require=createRequire(import.meta.url);
  const code=ts.transpileModule(readFileSync(new URL("../src/app/ochrana-osobnich-udaju/page.tsx",import.meta.url),"utf8"),{
    compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX},
  }).outputText;
  const result: {default?: () => ReturnType<typeof createElement>}={};
  vm.runInNewContext(code,{exports:result,require:(name:string)=>{
    if(name==="@/lib/privacy") return {...privacy,getPrivacyContact:()=>contact};
    if(name==="next/link") return {default:({children,...props}:{children?: React.ReactNode;href:string})=>createElement("a",props,children)};
    if(name==="react/jsx-runtime") return require(name);
    throw new Error("Unexpected privacy page dependency");
  }});
  assert.ok(result.default);
  return renderToStaticMarkup(createElement(result.default));
}

test("privacy page renders actual processing, unresolved items and rights without third-party widgets", () => {
  const html=renderPrivacy(null);
  for(const phrase of ["Michal Růžička", "nekomerční", "Clientelo", "jednorázového", "K doplnění / ověření", "právní základ", "databázi kontaktů získaných z formulářů", "Resend", "Cloudflare", "Vercel", "Pro a Enterprise", "mimo EHP", "Úřadu pro ochranu osobních údajů", "předem schváleným testovacím příjemcům", "Nepovolený požadavek není předán Resendu", "primární zpracování ve Spojených státech", "nepředstavuje jejich právní vyřešení", "Otevřená otázka současného dema", "serverové konfiguraci"]) assert.ok(html.includes(phrase),phrase);
  assert.ok(!html.includes("DEMO_ALLOWED_EMAILS"));
  assert.ok(!/dvě[^<.]*adres|přesně 2/i.test(html));
  assert.ok(!html.includes("před zveřejněním této změny"));
  assert.match(html, /<time\s+datetime="2026-10-28"/i);
  assert.equal((html.match(/<h1[ >]/g)??[]).length,1);
  assert.ok(html.includes('id="ochrana-obsah"'));
  assert.ok(!html.includes("mailto:"));
  assert.ok(!/<(?:script|iframe|form)[ >]/.test(html));
  assert.ok(!html.includes('type="checkbox"'));
  const ids=[...html.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(new Set(ids).size,ids.length);
  for(const [,target] of html.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.includes(target));
});

test("configured public contact replaces only its missing-contact notice", () => {
  const html=renderPrivacy(privacy.getPrivacyContact({PRIVACY_CONTACT_EMAIL:"contact@example.com"}));
  assert.ok(html.includes('href="mailto:contact%40example.com"'));
  assert.ok(html.includes("contact@example.com"));
  assert.ok(!html.includes("veřejný kontaktní e-mail správce zatím není určen"));
  assert.ok(!html.includes("Veřejný kontakt, právní základy"));
  assert.ok(!html.includes("kontakt pro žádosti musí správce doplnit"));
  // A configured contact alone must not falsely declare the remaining legal items complete.
  assert.ok(html.includes("právní základ"));assert.ok(html.includes("dosud nejsou plně uzavřeny"));
});
