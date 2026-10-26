# Dva Turnstile widgety na jedné stránce — 26. 10. 2026

Uživatel nahlásil, že HTML report dorazil, ale formulář průvodce nemá widget a zůstává neaktivní. Toto doručení je informace od uživatele; agent žádný reálný e-mail neposílal.

## Příčina

EmailForm v každé instanci renderoval next/script se stejným id a src a používal pouze onReady pro lokální ready stav. Kontrola skutečného node_modules/next/dist/client/script.js ukázala, že při souběžném načítání stejného src větev ScriptCache registruje druhému konzumentovi onLoad/onError, nikoli onReady. Lokální ready druhého formuláře tak může zůstat false. Následně se jeho efekt pro turnstile.render vůbec neprovede, nezíská token a tlačítko správně zůstane neaktivní. Identy widgetů a tokeny byly již lokální; problém byl v připravenosti společného skriptu, nikoli v e-mailu nebo validaci serveru.

Přečtena lokální dokumentace Next Script a primární dokumentace Cloudflare explicit rendering: https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/. Nepřistupovalo se k hodnotám tajných klíčů.

## Oprava

- Nový TurnstileProvider je na stránce jediným vlastníkem next/script. Sdílí pouze ready/failed prostřednictvím React contextu.
- Oba EmailForm čerpají společnou připravenost, ale samostatně volají render s vlastními kontejnery a action report/guide. Každý stále drží vlastní widgetId, token, reset a remove.
- Chyba načtení společného skriptu se zobrazí oběma formulářům. Tlačítka dál vyžadují token. Serverové Siteverify, hostname/action kontroly a oba endpointy nebyly měněny ani obcházeny.

## Ověření

Přidány dva automatické testy skutečných komponent přes izolovaný hook harness. Používají existující TypeScript transpileModule a vm, bez nové závislosti, DOM knihovny nebo sítě. Ověřují jednoho vlastníka skriptu, připravenost/chybu, dvě současně připojené instance, různé widgetId a action, nezávislé tokeny a tlačítka, mockovanou chybu 503, následný pokus s novým tokenem, mockované přijetí 202, expiraci, chybu widgetu a samostatné cleanup. Mock fetch nikdy nekontaktuje aplikaci ani Resend. Jde o testy životního cyklu a callbacků; nenahrazují kompletní React DOM/prohlížečový ani Cloudflare integrační test.

npm test: 50/50 prošlo. npm run lint: prošel. Výchozí produkční build opět narazil na známou chybu Turbopacku při spouštění pomocného CSS procesu. Build přes npm run build -- --webpack s NODE_OPTIONS=--use-system-ca prošel včetně TypeScriptu a generování stránek. Beze změny build skriptu a závislostí. git diff --check bez chyb (běžná upozornění na LF/CRLF). Node test runner nadále vypisuje neblokující MODULE_TYPELESS_PACKAGE_JSON upozornění.

Neprováděl se živý Cloudflare challenge, prohlížečový test ani skutečné odeslání reportu nebo PDF. Výslovný zákaz skutečných e-mailů zůstal dodržen. Žádný commit ani deployment. Změny tohoto kroku: src/components/turnstile-provider.tsx, src/components/email-form.tsx, src/app/page.tsx, tests/turnstile-ui.test.mts a tento záznam. Dřívější necommitnutá práce zůstala zachována. Tento záznam je autentický souhrn práce, nikoli smyšlený export konverzace.
