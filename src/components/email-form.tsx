"use client";

import Link from "next/link";
import { useTurnstile } from "./turnstile-provider";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { ReportScenario } from "@/lib/email/validation";
import { validEmail } from "@/lib/email/validation";
import { beginFormAttempt, completeFormAttempt, observeForm, trackAnalytics } from "@/lib/analytics";

export interface DeliveryUiConfig { enabled: boolean; siteKey: string }
interface TurnstileApi {
  render: (element: HTMLElement, options: Record<string, unknown>) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
}
declare global { interface Window { turnstile?: TurnstileApi } }

export function EmailForm({ id, buttonText, kind, delivery, scenario }: {
  id: string; buttonText: string; kind: "report" | "guide"; delivery: DeliveryUiConfig; scenario?: ReportScenario | null;
}) {
  const [status, setStatus] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [emailError, setEmailError] = useState(false);
  const { ready, failed } = useTurnstile();
  const [token, setToken] = useState("");
  const [verificationError, setVerificationError] = useState("");
  const widgetElement = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const emailInput = useRef<HTMLInputElement>(null);
  const trapInput = useRef<HTMLInputElement>(null);
  const sending = useRef(false);
  const formElement = useRef<HTMLFormElement>(null);
  const logicalRequest = useRef<{ requestId: string; email: string; scenario?: ReportScenario; startedAt: number; uncertain: boolean; blocked: boolean } | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [retryBlocked, setRetryBlocked] = useState(false);

  useEffect(() => {
    if (formElement.current) return observeForm(formElement.current, kind);
  }, [kind]);

  useEffect(() => {
    if (!ready || !delivery.enabled || !widgetElement.current || !window.turnstile) return;
    const api = window.turnstile;
    const instance = api.render(widgetElement.current, {
      sitekey: delivery.siteKey, action: kind, theme: "light", size: "flexible", language: "cs",
      callback: (value: string) => { setToken(value); setVerificationError(""); },
      "expired-callback": () => { setToken(""); setVerificationError("Ověření vypršelo. Počkejte na nové ověření nebo stránku obnovte."); },
      "error-callback": () => { setToken(""); setVerificationError("Ověření se nepodařilo načíst. Zkontrolujte připojení a obnovte stránku."); },
    });
    widgetId.current = instance;
    return () => { widgetId.current = null; api.remove(instance); };
  }, [ready, delivery.enabled, delivery.siteKey, kind]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending.current || logicalRequest.current?.blocked || !delivery.enabled || !ready || failed || !token || (kind === "report" && !scenario && !logicalRequest.current)) return;
    const email = logicalRequest.current?.email ?? emailInput.current?.value.trim();
    if (!validEmail(email)) {
      trackAnalytics({ name: "form_error", material: kind, error: "validation" });
      setEmailError(true); setStatus("error"); setMessage("Zadejte platnou e-mailovou adresu.");
      emailInput.current?.focus();
      return;
    }
    // Keep the exact original recipient and scenario after an ambiguous result.
    // No automatic retry; every repeat still needs a fresh Turnstile token.
    if (logicalRequest.current && Date.now() - logicalRequest.current.startedAt >= 23 * 3600000) {
      setStatus("error"); setMessage("Žádost je příliš stará pro bezpečné opakování. Nejprve ověřte původní doručení; nové odeslání by mohlo vytvořit další e-mail."); return;
    }
    if (!logicalRequest.current) {
      try { logicalRequest.current = { requestId: window.crypto.randomUUID(), email, ...(kind === "report" ? { scenario: { ...scenario! } } : {}), startedAt: Date.now(), uncertain: false, blocked: false }; }
      catch { setStatus("error"); setMessage("Bezpečné vytvoření žádosti není dostupné. Použijte aktuální prohlížeč na zabezpečené stránce."); return; }
    }
    const currentRequest = logicalRequest.current;
    setEmailError(false);
    sending.current = true;
    const measuredAttempt = beginFormAttempt(kind);
    setStatus("pending"); setMessage("Odesíláme váš požadavek…");
    try {
      const response = await fetch(`/api/materials/${kind}`, {
        method: "POST", headers: {"Content-Type": "application/json"},
        body: JSON.stringify({requestId: currentRequest.requestId, email: currentRequest.email, website: trapInput.current?.value ?? "", turnstileToken: token, ...(kind === "report" ? {scenario: currentRequest.scenario} : {})}),
        signal: AbortSignal.timeout(30000),
      });
      const body = await response.json().catch(() => null);
      if (response.status === 202 && body?.status === "accepted") {
        logicalRequest.current = null; setRetrying(false); setRetryBlocked(false);
        completeFormAttempt(measuredAttempt);
        setStatus("success");
        setMessage(`E-mailová služba přijala ${kind === "report" ? "váš report" : "průvodce s PDF přílohou"} k odeslání. Zkontrolujte poštu i spam. Přijetí službou ještě nepotvrzuje doručení.${kind === "report" ? " Výpis používá scénář platný při odeslání formuláře." : ""}`);
      } else {
        const demoDenied = response.status === 403 && body?.status === "error" && body?.code === "demo_not_allowed";
        const correctable = ((response.status === 400 && body?.status === "error" && body?.code === "input_rejected") || demoDenied) && !currentRequest.uncertain;
        if (correctable) { logicalRequest.current = null; setRetrying(false); }
        else { currentRequest.uncertain = true; setRetrying(true); }
        const conflict = response.status === 503 && body?.status === "error" && body?.code === "request_conflict";
        if (conflict) { currentRequest.blocked = true; setRetryBlocked(true); }
        // Demo eligibility is neither a validation/protection failure nor a conversion.
        if (!demoDenied) completeFormAttempt(measuredAttempt, response.status === 400 ? "validation" : response.status === 403 ? "verification" : response.status === 429 ? "busy" : "server");
        setStatus("error");
        setMessage(conflict ? "Tuto žádost nelze bezpečně zopakovat. Nejprve ověřte předchozí zaslání nebo kontaktujte správce; neposílejte ji znovu z jiné karty." : response.status === 503 && body?.code === "request_pending" ? "Žádost se ještě zpracovává. Vyčkejte a potom zopakujte stejnou žádost s novým ověřením." : correctable ? "Žádost byla odmítnuta před odesíláním. Opravte e-mail nebo parametry a odešlete novou žádost." : response.status === 400 ? "Tento pokus byl odmítnut, ale předchozí výsledek nelze bezpečně určit. Zachováváme původní žádost; nejprve ověřte předchozí zaslání." : response.status === 403 ? "Ověření proti robotům vypršelo nebo se nezdařilo. Zkuste nové ověření." : response.status === 429 ? "Služba je dočasně vytížená. Zkuste to za chvíli." : "Odeslání nebylo potvrzeno. Zkuste to později; stejné požadavky chráníme proti duplicitnímu odeslání.");
        if (demoDenied) setMessage(`ETF Kompas je demonstrační projekt. Zasílání materiálů je dostupné pouze předem schváleným testovacím příjemcům. Kalkulačku můžete používat bez omezení.${correctable ? " Adresu můžete opravit a podat novou žádost." : " Tento pokus nebyl odeslán, ale výsledek předchozího pokusu zůstává nejasný. Zachováváme původní žádost; nejprve ověřte předchozí zaslání."}`);
      }
    } catch {
      currentRequest.uncertain = true;
      setRetrying(true);
      completeFormAttempt(measuredAttempt, "network");
      setStatus("error"); setMessage("Odeslání nebylo potvrzeno. Zkontrolujte připojení a zkuste to znovu; stejné požadavky chráníme proti duplicitnímu odeslání.");
    } finally {
      sending.current = false; setToken("");
      if (widgetId.current !== null) window.turnstile?.reset(widgetId.current);
    }
  }

  return (
    <form ref={formElement} className="email-form" onSubmit={submit}
      onFocusCapture={() => trackAnalytics({ name: "form_start", material: kind }, `form_start:${kind}`)}
      onPointerDownCapture={() => trackAnalytics({ name: "form_start", material: kind }, `form_start:${kind}`)}
      onInvalidCapture={() => trackAnalytics({ name: "form_error", material: kind, error: "validation" })}
      aria-label={kind === "report" ? "Podrobný report na e-mail" : "Průvodce ETF na e-mail"} aria-busy={status === "pending"}>
      <p id={`${id}-demo`} className="form-availability"><strong>Demonstrační režim:</strong> report a PDF zasíláme pouze předem schváleným testovacím příjemcům. Kalkulačka je dostupná všem.</p>
      <label htmlFor={`${id}-email`}>Váš e-mail <span className="muted">(povinné)</span></label>
      <div className="email-row">
        {/* No name: a native submit without JavaScript cannot put the email in the URL. */}
        <input ref={emailInput} id={`${id}-email`} type="email" required maxLength={254} autoComplete="email" placeholder="vas@email.cz" aria-invalid={emailError} aria-describedby={`${id}-demo ${id}-privacy ${id}-availability ${id}-feedback`} onChange={() => { if (emailError) { setEmailError(false); setMessage(""); } }} disabled={status === "pending" || retrying} />
        <button type="submit" className="primary-button" disabled={retryBlocked || !delivery.enabled || !ready || failed || !token || status === "pending" || (kind === "report" && !scenario && !retrying)}>{status === "pending" ? "Odesíláme…" : retryBlocked ? "Žádost vyžaduje kontrolu" : retrying ? "Zopakovat stejnou žádost" : buttonText}<span aria-hidden="true">↗</span></button>
      </div>
      <div className="honeypot" aria-hidden="true"><label htmlFor={`${id}-website`}>Webová stránka</label><input ref={trapInput} id={`${id}-website`} name="website" tabIndex={-1} autoComplete="off" maxLength={200} /></div>
      {delivery.enabled && <>
        <div ref={widgetElement} className="turnstile-widget" aria-label="Ověření proti automatizovaným požadavkům" />
      </>}
      <p id={`${id}-availability`} className="form-availability">{!delivery.enabled ? "Odesílání je momentálně nedostupné. Zkuste to později." : kind === "report" && !scenario && !retrying ? "Pro zaslání reportu nejprve vyplňte platné parametry kalkulačky." : token && ready && !failed ? "Ověření dokončeno. Můžete požádat o zaslání materiálu." : "Pro odeslání je potřeba dokončit ověření proti robotům."}</p>
      {(failed || verificationError) && <p className="form-feedback error" role="alert">{verificationError || "Ověření se nepodařilo načíst. Zkontrolujte připojení a obnovte stránku."}</p>}
      <p id={`${id}-privacy`} className="form-privacy">V tomto nekomerčním demu zpracujeme zadaný e-mail pro ověření žádosti a případné jednorázové doručení {kind === "report" ? "vyžádaného reportu" : "PDF průvodce"} přes Resend předem schválenému testovacímu příjemci. Nevytváříme databázi kontaktů získaných z formulářů. K automatickému marketingu, newsletteru ani ETF Hlídači vás nepřihlašujeme. <Link href="/ochrana-osobnich-udaju">Jak zpracováváme osobní údaje</Link>.</p>
      <p id={`${id}-feedback`} className={`form-feedback ${status === "error" ? "error" : ""}`} role="status" aria-live="polite">{message}</p>
      {retrying && <p className="form-feedback">{retryBlocked ? "Opakování je zastavené. " : "Opakování použije původní adresu i scénář a vyžaduje nové ověření proti robotům. "}Dokud výsledek neověříte, neobnovujte stránku ani neposílejte žádost z jiné karty: paměť žádosti by se ztratila a mohl by vzniknout další e-mail. Po potvrzení lze zaslat novou žádost.</p>}
      <noscript><p>Pro bezpečné odeslání formuláře je potřeba JavaScript.</p></noscript>
    </form>
  );
}
