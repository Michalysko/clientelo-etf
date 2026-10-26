"use client";

import { useTurnstile } from "./turnstile-provider";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { ReportScenario } from "@/lib/email/validation";
import { validEmail } from "@/lib/email/validation";

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
    if (sending.current || !delivery.enabled || !ready || failed || !token || (kind === "report" && !scenario)) return;
    const email = emailInput.current?.value.trim();
    if (!validEmail(email)) {
      setEmailError(true); setStatus("error"); setMessage("Zadejte platnou e-mailovou adresu.");
      emailInput.current?.focus();
      return;
    }
    setEmailError(false);
    sending.current = true;
    setStatus("pending"); setMessage("Odesíláme váš požadavek…");
    try {
      const response = await fetch(`/api/materials/${kind}`, {
        method: "POST", headers: {"Content-Type": "application/json"},
        body: JSON.stringify({email, website: trapInput.current?.value ?? "", turnstileToken: token, ...(kind === "report" ? {scenario} : {})}),
        signal: AbortSignal.timeout(30000),
      });
      const body = await response.json().catch(() => null);
      if (response.status === 202 && body?.status === "accepted") {
        setStatus("success");
        setMessage(`E-mailová služba přijala ${kind === "report" ? "váš report" : "průvodce s PDF přílohou"} k odeslání. Zkontrolujte poštu i spam. Přijetí službou ještě nepotvrzuje doručení.${kind === "report" ? " Výpis používá scénář platný při odeslání formuláře." : ""}`);
      } else {
        setStatus("error");
        setMessage(response.status === 400 ? "Zkontrolujte e-mail a platnost parametrů kalkulačky." : response.status === 403 ? "Ověření proti robotům vypršelo nebo se nezdařilo. Zkuste nové ověření." : response.status === 429 ? "Služba je dočasně vytížená. Zkuste to za chvíli." : "Odeslání nebylo potvrzeno. Zkuste to později; stejné požadavky chráníme proti duplicitnímu odeslání.");
      }
    } catch {
      setStatus("error"); setMessage("Odeslání nebylo potvrzeno. Zkontrolujte připojení a zkuste to znovu; stejné požadavky chráníme proti duplicitnímu odeslání.");
    } finally {
      sending.current = false; setToken("");
      if (widgetId.current !== null) window.turnstile?.reset(widgetId.current);
    }
  }

  return (
    <form className="email-form" onSubmit={submit} aria-label={kind === "report" ? "Podrobný report na e-mail" : "Průvodce ETF na e-mail"} aria-busy={status === "pending"}>
      <label htmlFor={`${id}-email`}>Váš e-mail <span className="muted">(povinné)</span></label>
      <div className="email-row">
        {/* No name: a native submit without JavaScript cannot put the email in the URL. */}
        <input ref={emailInput} id={`${id}-email`} type="email" required maxLength={254} autoComplete="email" placeholder="vas@email.cz" aria-invalid={emailError} aria-describedby={`${id}-privacy ${id}-availability ${id}-feedback`} onChange={() => { if (emailError) { setEmailError(false); setMessage(""); } }} disabled={status === "pending"} />
        <button type="submit" className="primary-button" disabled={!delivery.enabled || !ready || failed || !token || status === "pending" || (kind === "report" && !scenario)}>{status === "pending" ? "Odesíláme…" : buttonText}<span aria-hidden="true">↗</span></button>
      </div>
      <div className="honeypot" aria-hidden="true"><label htmlFor={`${id}-website`}>Webová stránka</label><input ref={trapInput} id={`${id}-website`} name="website" tabIndex={-1} autoComplete="off" maxLength={200} /></div>
      {delivery.enabled && <>
        <div ref={widgetElement} className="turnstile-widget" aria-label="Ověření proti automatizovaným požadavkům" />
      </>}
      <p id={`${id}-availability`} className="form-availability">{!delivery.enabled ? "Odesílání je momentálně nedostupné. Zkuste to později." : kind === "report" && !scenario ? "Pro zaslání reportu nejprve vyplňte platné parametry kalkulačky." : token && ready && !failed ? "Ověření dokončeno. Můžete požádat o zaslání materiálu." : "Pro odeslání je potřeba dokončit ověření proti robotům."}</p>
      {(failed || verificationError) && <p className="form-feedback error" role="alert">{verificationError || "Ověření se nepodařilo načíst. Zkontrolujte připojení a obnovte stránku."}</p>}
      <p id={`${id}-privacy`} className="form-privacy">E-mail použijeme k jednorázovému zaslání přes Resend. Bez přihlášení k newsletteru či ETF Hlídači. <a href="#osobni-udaje">Zpracování údajů</a>.</p>
      <p id={`${id}-feedback`} className={`form-feedback ${status === "error" ? "error" : ""}`} role="status" aria-live="polite">{message}</p>
      <noscript><p>Pro bezpečné odeslání formuláře je potřeba JavaScript.</p></noscript>
    </form>
  );
}
