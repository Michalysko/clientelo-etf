"use client";

import Script from "next/script";
import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { analytics, ANALYTICS_HOST, CONSENT_KEY, CONSENT_DAYS, readConsent, saveConsent, UMAMI_SCRIPT, UMAMI_WEBSITE_ID } from "@/lib/analytics";
import type { AnalyticsPayload, Consent } from "@/lib/analytics";

declare global {
  interface Window {
    etfAnalyticsBeforeSend?: (type: string, payload: unknown) => AnalyticsPayload | false;
    umami?: { track: (payload: AnalyticsPayload) => unknown };
  }
}

/** Isolated Suspense boundary keeps the static page intact while observing
 * query-only App Router navigations as well as path changes. */
export function AnalyticsRouteObserver({ enabled }: { enabled: boolean }) {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  useEffect(() => {
    if (enabled) analytics.enter({ pathname, href: window.location.href, referrer: document.referrer });
  }, [enabled, pathname, search]);
  return null;
}

export function AnalyticsProvider({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  const pathname = usePathname();
  const [choice, setChoice] = useState<Consent | null | "loading">("loading");
  const [editing, setEditing] = useState(false);
  const [storageFailed, setStorageFailed] = useState(false);
  const [permitted, setPermitted] = useState(false);
  const [trackerFailed, setTrackerFailed] = useState(false);
  const preferencesButton = useRef<HTMLButtonElement>(null);
  const consentHeading = useRef<HTMLHeadingElement>(null);

  const documentChoice = useRef<Consent | null>(null);
  const initialized = useRef(false);
  const channel = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    let alive = true;
    const allow = enabled && window.location.hostname === ANALYTICS_HOST;
    window.etfAnalyticsBeforeSend = (type, payload) => analytics.beforeSend(type, payload);
    const stop = (next: Consent | null) => {
      const wasGranted = documentChoice.current === "granted";
      analytics.setConsent(false, false);
      documentChoice.current = next;
      if (alive) setChoice(next);
      if (wasGranted) window.location.reload();
    };
    const restore = () => {
      let saved: Consent | null = null, failed = false;
      try {
        saved = readConsent(window.localStorage);
        // Persisted grants from the earlier implementation are never authority.
        // New grants exist only in this document; denials may survive reloads.
        if (saved === "granted") { window.localStorage.removeItem(CONSENT_KEY); saved = null; }
      } catch { failed = true; }
      if (!initialized.current) {
        initialized.current = true;
        documentChoice.current = saved === "denied" ? "denied" : null;
        analytics.setConsent(false, false);
        if (alive) { setChoice(documentChoice.current); setPermitted(allow); }
      } else if (documentChoice.current === "granted" && (failed || saved === "denied" || !analytics.hasConsent())) {
        stop(saved === "denied" ? "denied" : null);
      }
      // A local denial stays authoritative even if storage/fragment changes.
      if (failed && alive) setStorageFailed(true);
    };
    queueMicrotask(() => { if (alive) restore(); });
    const changed = (event: StorageEvent) => { if (event.key === CONSENT_KEY || event.key === null) restore(); };
    // A document frozen in BFCache must not resume an older in-memory grant
    // after missing revocation messages while it was suspended.
    const leaving = () => { analytics.setConsent(false, false); };
    const returned = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      analytics.setConsent(false, false); documentChoice.current = null;
      if (alive) { setChoice(null); setEditing(false); }
    };
    try {
      if (typeof window.BroadcastChannel === "function") {
        channel.current = new window.BroadcastChannel("etf-kompas.analytics-consent.v1");
        channel.current.onmessage = event => {
          if (event.data !== "denied") return;
          try { if (!saveConsent(window.localStorage, "denied") && alive) setStorageFailed(true); } catch { if (alive) setStorageFailed(true); }
          stop("denied");
        };
      }
    } catch { channel.current = null; }
    window.addEventListener("storage", changed);
    window.addEventListener("focus", restore);
    window.addEventListener("pagehide", leaving);
    window.addEventListener("pageshow", returned);
    const expiry = window.setInterval(restore, 60000);
    return () => { alive = false; window.removeEventListener("storage", changed); window.removeEventListener("focus", restore); window.removeEventListener("pagehide", leaving); window.removeEventListener("pageshow", returned); window.clearInterval(expiry); channel.current?.close(); channel.current = null; };
  }, [enabled]);

  useEffect(() => {
    if (choice === "granted" && permitted) analytics.enter({ pathname, href: window.location.href, referrer: document.referrer });
  }, [choice, pathname, permitted]);

  useEffect(() => {
    if (editing) consentHeading.current?.focus();
  }, [editing]);

  function choose(next: Consent) {
    const wasGranted = documentChoice.current === "granted";
    if (next === "denied") analytics.setConsent(false, false);
    documentChoice.current = next;
    let stored = false;
    try {
      if (next === "denied") stored = saveConsent(window.localStorage, "denied");
      else { window.localStorage.removeItem(CONSENT_KEY); stored = true; }
    } catch {}
    setStorageFailed(!stored); setChoice(next); setEditing(false);
    if (next === "granted") {
      analytics.setConsent(true, permitted, Date.now() + CONSENT_DAYS * 86400000);
      if (permitted) analytics.enter({ pathname, href: window.location.href, referrer: document.referrer });
    } else {
      try { channel.current?.postMessage("denied"); } catch {}
      // Reload only after persistence succeeds. When it fails, the closed gate
      // and before-send filter stop this document and the UI keeps the warning.
      // A later manual reload cannot restore a grant: none are trusted on boot.
      if (wasGranted && stored) window.location.reload();
    }
    preferencesButton.current?.focus({ preventScroll: true });
  }

  const show = choice !== "loading" && (choice === null || editing);
  return <>
    <Suspense fallback={null}><AnalyticsRouteObserver enabled={choice === "granted" && permitted} /></Suspense>
    {show && <aside className="analytics-consent" aria-labelledby="analytics-consent-title">
      <div className="wrap consent-inner">
        <div><h2 ref={consentHeading} tabIndex={-1} id="analytics-consent-title">Pomůžete nám zlepšit ETF Kompas?</h2>
          <p>Volitelná analytika Umami měří návštěvnost, používání kalkulačky a úspěšnost formulářů. E-mail ani investiční hodnoty do analytiky neposíláme. Odmítnutí nic neomezí. <Link href="/ochrana-osobnich-udaju#analytika">Podrobnosti o analytice</Link>.</p>
          {choice === "granted" && <p>Odvolání zastaví měření. Při obnovení stránky se rozpracované neodeslané údaje ztratí.</p>}
        </div>
        <div className="consent-actions"><button type="button" onClick={() => choose("granted")}>Povolit analytiku</button><button type="button" onClick={() => choose("denied")}>Odmítnout</button>
          {choice !== null && <button type="button" onClick={() => { setEditing(false); preferencesButton.current?.focus({ preventScroll: true }); }}>Zavřít nastavení</button>}
        </div>
      </div>
    </aside>}
    {choice === "granted" && permitted && <Script id="etf-umami" src={UMAMI_SCRIPT} strategy="afterInteractive" referrerPolicy="no-referrer"
      data-website-id={UMAMI_WEBSITE_ID} data-domains={ANALYTICS_HOST} data-auto-track="false" data-auto-pageview="false" data-performance="false" data-exclude-hash="true" data-before-send="etfAnalyticsBeforeSend"
      onReady={() => { if (window.umami) analytics.ready(payload => window.umami?.track(payload)); }}
      onError={() => { setTrackerFailed(true); }} />}
    {children}
    <div className="analytics-preferences wrap">
      <button ref={preferencesButton} type="button" aria-expanded={show} aria-controls={show ? "analytics-consent-title" : undefined} onClick={() => { setEditing(true); window.scrollTo({ top: 0, behavior: "instant" }); }}>Nastavení analytiky</button>
      <span role="status">{storageFailed ? "Preferenci se nepodařilo trvale změnit. Aktuální volba platí jen zde; po obnovení se měření samo nepovolí." : trackerFailed ? "Analytiku se nepodařilo načíst. Kalkulačka i doručování fungují dál." : choice === "denied" ? "Analytika odmítnuta." : choice === "granted" ? "Analytika povolena pro tuto otevřenou stránku. Po obnovení je potřeba nové potvrzení. Souhlas můžete odvolat v nastavení." : "Analytika čeká na vaši volbu."}</span>
    </div>
  </>;
}
