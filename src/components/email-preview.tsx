"use client";

import { useState } from "react";

export function EmailPreview({ id, buttonText, kind }: { id: string; buttonText: string; kind: "report" | "guide" }) {
  const [attempted, setAttempted] = useState(false);
  return (
    <form className="email-form" onSubmit={(event) => { event.preventDefault(); setAttempted(true); }} aria-label={kind === "report" ? "Podrobný výpis na e-mail — připravujeme" : "Průvodce ETF na e-mail — připravujeme"}>
      <label htmlFor={`${id}-email`}>Váš e-mail <span className="muted">(povinné)</span></label>
      <div className="email-row">
        {/* No name: even a native submit before hydration cannot put the email in the URL. */}
        <input id={`${id}-email`} type="email" required autoComplete="email" placeholder="vas@email.cz" aria-describedby={`${id}-availability`} />
        <button type="submit" className="primary-button">{buttonText}<span aria-hidden="true">↗</span></button>
      </div>
      <p id={`${id}-availability`} className="form-availability">Doručování aktivujeme později. E-mail se nyní nikam neodesílá ani neukládá.</p>
      <p className="form-feedback" role="status">{attempted ? `${kind === "report" ? "Výpis" : "Průvodce"} zatím nelze odeslat. Váš e-mail nebyl odeslán ani uložen.` : ""}</p>
    </form>
  );
}
