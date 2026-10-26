# Report a PDF průvodce — 26. 10. 2026

## Zadání a rozhodnutí

Uživatel požadoval dvě skutečné konverzní cesty přes Resend, serverový přepočet existujícím modelem, HTML/text report, český PDF průvodce, validaci a testy. Výslovně zakázal reálné testovací odesílání bez další autorizace, commit a deployment. Tento soubor je technický souhrn skutečné práce, nikoli autentický export konverzace. Export zatím není uložen.

Po vysvětlení možností uživatel schválil „Turnstile + honeypot + Resend idempotence, bez databáze a bez distribuovaného limitu podle IP“. Implementace proto nemá databázi ani paměťový limiter vydávaný za distribuovanou ochranu. Turnstile a idempotence nejsou pevný limit počtu různých zpráv; toto omezení je popsáno v docs/email-delivery.md.

## Provedené změny

- Přidány dva POST Route Handlers a oddělené moduly konfigurace, validace, serverového výpočtu, obsahu a poskytovatelů. Použit nativní fetch bez nové aplikační závislosti.
- Server přijímá pouze povolené parametry, ověřuje původ požadavku, velikost těla do 8192 bajtů, honeypot a Turnstile hostname/action. Výsledky přepočítává podle kanonických ETF dat. Počáteční investice zůstává 0 Kč v souladu se současným modelem; metodika vkladů na konci měsíce se nemění.
- Resend dostává HTML i text. Report obsahuje roční tabulku, scénář, nákladovost, metodiku, rizika a zdroje. Úspěch se vrací až po potvrzení přijetí službou, nikoli jako potvrzení doručení. Idempotency-Key je HMAC celého deterministického obsahu a příjemce; neobsahuje čitelný kontakt.
- Nahrazen neaktivní náhled formulářů skutečnými stavy odesílání, chyby a přijetí. Bez kompletní konfigurace zůstávají formuláře vypnuté. Jednorázové vyžádání materiálu nevytváří marketingový souhlas.
- Pomocí ReportLabu vytvořen sedmistránkový průvodce s českými fonty, klikacími zdroji a datem zpracování. Zdrojový skript čerpá modelový příklad přímo z existujícího výpočtu a dat. PDF má 127365 bajtů, je mimo public a odesílá se jako příloha. Next output tracing zahrnuje PDF pro serverový handler.
- README a docs/email-delivery.md popisují konfiguraci, ochrany, testy, omezení a zbývající provozní povinnosti. Zdrojové klíče ani kontakty se do dokumentace nezapisovaly.

## Ověření a skutečné chyby

- Spuštěno npm test: po opravách 48/48 testů prošlo (26 původních a 22 nových). Poskytovatelé jsou mockovaní; testy nečtou lokální tajemství ani neposílají zprávy.
- První testovací běh odhalil nepodporované TypeScript parameter properties v nativním Node type stripping. Nahrazeny explicitními vlastnostmi třídy.
- Produkční build odhalil typovou nekompatibilitu testovací konfigurace a různě odvozených hlaviček. Opraveny explicitními Record typy. Následný npm run lint a produkční build prošly. Build spuštěn s NODE_OPTIONS=--use-system-ca.
- Při průzkumu PDF nástrojů nebyl dostupný fitz; použit dostupný pdftoppm bez instalace závislosti. Renderováno a vizuálně zkontrolováno všech sedm finálních stran. Opravena interpretace neescapovaného ampersandu v ReportLab textu S&P 500. Žádné zjištěné oříznutí ani chybějící diakritika ve finální verzi.
- Produkční aplikace a syntetický HTML report byly otevřeny lokálně v prohlížeči. Report i stránka byly zkontrolovány v šířkách 375 a 390 px bez horizontálního přetékání. Konzole aplikace při kontrole bez chyb a varování. Neproběhlo vyplnění skutečného kontaktu ani odeslání formuláře.
- Ověřeno zahrnutí PDF v produkčním route.js.nft.json. git diff --check bez chyb; Git upozorňuje na běžnou konverzi LF/CRLF ve Windows.
- git check-ignore potvrdil ignorování .env.local; Git nesleduje žádný .env soubor. Kontrola 42 existujících kandidátních souborů repozitáře a 24 klientských build souborů proti skutečným lokálním hodnotám Resend klíče a odesílatele nenašla shodu. Hodnoty nebyly vypsány. Nový tento souhrn obsahuje pouze názvy proměnných a počty.

## Konfigurace a omezení

Kontrola pouze přítomnosti názvů proměnných potvrdila nastavené RESEND_API_KEY a RESEND_FROM_EMAIL. Chybí TURNSTILE_SECRET_KEY, NEXT_PUBLIC_TURNSTILE_SITE_KEY a APP_ORIGIN. Proto nyní odesílání není aktivní. Klíče musí uživatel zadat mimo chat do ignorovaného prostředí a následně provést nový build/restart. Reálné Turnstile ověření, přijetí Resendem, doručení do schránky ani chování všech e-mailových klientů nebylo testováno. Reálný test čeká na samostatnou autorizaci uživatele na jeho vlastní adresu.

Před veřejným provozem zbývá doplnit skutečné údaje správce a pravidla uchovávání osobních údajů. Nevznikla databáze kontaktů, analytika, cron, ETF Hlídač, Git commit ani deployment.

## Použité zdroje

Technické primární zdroje, navštívené při implementaci: Resend Send Email a Idempotency Keys; Cloudflare Turnstile server-side validation, client-side rendering a testing. Přesné odkazy jsou v docs/email-delivery.md. Vzdělávací PDF používá Investor.gov/SEC, S&P DJI, Vanguard, iShares, Evropskou komisi, ESMA, LYNX a State Street; přesné odkazy jsou přímo v PDF a generovacím skriptu.

Použité AI zadání zahrnovalo původní požadavek uživatele na obě konverzní cesty a jeho výše citované rozhodnutí o ochraně. Tento záznam nevytváří ani nenahrazuje doslovný export promptů a konverzace.
