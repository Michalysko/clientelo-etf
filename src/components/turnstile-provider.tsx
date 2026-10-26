"use client";

import Script from "next/script";
import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";

const TurnstileContext = createContext({ ready: false, failed: false });
export const useTurnstile = () => useContext(TurnstileContext);

/** One script owner; each form still renders and manages its own widget. */
export function TurnstileProvider({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  return <TurnstileContext.Provider value={{ ready, failed }}>
    {enabled && <Script id="etf-turnstile" src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive"
      onReady={() => { setReady(true); setFailed(false); }}
      onError={() => { setReady(false); setFailed(true); }} />}
    {children}
  </TurnstileContext.Provider>;
}
