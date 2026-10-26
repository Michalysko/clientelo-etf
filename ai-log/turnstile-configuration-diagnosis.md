# Diagnostika nedostupného formuláře — 26. 10. 2026

Uživatel požádal o zjištění důvodu skrytého Turnstile a neaktivního tlačítka po doplnění prostředí. Nebylo autorizováno reálné odesílání.

Prověřeny config.ts, page.tsx, email-form.tsx a související testy. Stránka předává publicDeliveryConfig(). Při výjimce readDeliveryConfig() vrací enabled: false a prázdný siteKey. Formulář tehdy nenačítá widget a zakáže tlačítko; server při neplatné konfiguraci také odmítá odesílání.

Přes @next/env byl použit stejný způsob načtení vývojového prostředí jako v Next.js. Diagnostika vypisovala pouze názvy proměnných, přítomnost a booleovské výsledky kontrol, nikdy hodnoty ani části klíčů. Příčina: v .env.local existuje NEXT_PUBLIC_TURNSTILE_API_KEY místo požadovaného NEXT_PUBLIC_TURNSTILE_SITE_KEY. Ostatní čtyři požadované proměnné byly přítomné; odesílatel, origin a zákaz testovacích Turnstile klíčů prošly existujícími lokálními kontrolami. To neověřuje skutečnou platnost klíčů u poskytovatelů.

Uživateli doporučeno přejmenovat chybný název, zachovat hodnotu pouze pokud jde o veřejný Cloudflare Site Key, a restartovat vývojový server. .env.local nebyl upraven. Kód konfigurace není příčinou; bezpečné odmítnutí zůstává zachováno. Doplněna regresní assertion do stávajícího testu pro tento konkrétní překlep.

Kontroly: npm test prošlo 48/48, npm run lint prošel. Standardní npm run build s NODE_OPTIONS=--use-system-ca selhal v Turbopacku při spouštění pomocného CSS procesu, a to v sandboxu i při opakování mimo něj. Alternativní npm run build -- --webpack nejprve narazil na důvěru certifikátu Google Fonts; opakování s NODE_OPTIONS=--use-system-ca prošlo včetně TypeScriptu, generování stránek a tracingu (exit 0). Build skript ani závislosti nebyly změněny. Testovací běh vypisuje již existující neblokující upozornění Node MODULE_TYPELESS_PACKAGE_JSON.

git check-ignore znovu potvrdil ignorování .env.local. Reálné e-maily ani síťové ověření Turnstile nebyly provedeny. Žádný commit ani deployment. Tento soubor je souhrn skutečné práce, nikoli export konverzace.
