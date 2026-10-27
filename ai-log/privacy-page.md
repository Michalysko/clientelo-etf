# Informace o osobních údajích — 27. 10. 2026

## Autentický podklad a rozsah

Uživatel požádal: „Doplň transparentní a srozumitelné informace o zpracování osobních údajů v českém jazyce.“ Požadoval samostatnou App Router stránku, propojení formulářů, audit skutečného zpracování a testy bez změny doručování či výpočtu. Zakázal skutečné e-maily, commit, push a deployment. Tento soubor je technický souhrn skutečné práce, nikoli doslovný export konverzace.

Na cílený dotaz uživatel uvedl: „Jméno správce: Michal Růžička.“ Zároveň výslovně sdělil, že veřejná kontaktní adresa není definitivně určená, má být samostatně konfigurovatelná a před veřejným provozem doplněná a ověřená. Žádná adresa nebyla vymyšlena ani odvozena z Resend odesílatele.

## Provedená práce a rozhodnutí

- Přečten AGENTS.md, lokální Next dokumentace Link, metadata a fontů. Zkontrolovány handler, validace, oba providery, formuláře, Turnstile provider, layout a závislosti. Nebyla přidána závislost ani refaktorována architektura.
- Ověřen tok: klient posílá e-mail, technická pole a u reportu scénář; server znovu počítá; Resend dostává adresu, zprávu a případnou obecnou PDF přílohu. Siteverify neobsahuje adresu ani scénář; prohlížeč přesto přímo komunikuje s Cloudflare. Bez ověření se neodesílá.
- Nenalezen vlastní kontaktový databázový zápis, zápis formulářů do souboru nebo aplikační console logování; pouze čtení PDF. Nenalezena vlastní práce s cookies či web storage pro kontakty, Vercel/Google Analytics nebo marketingové pixely. To není audit interního ukládání poskytovatelů. Ověřeno self-hostování fontů přes next/font.
- Přidána serverová stránka `/ochrana-osobnich-udaju`, metadata, datum 27. 10. 2026, obsahová navigace a přístupné sekce. Popisuje kategorii údajů, účel, role poskytovatelů, retenci, možné přenosy, práva a nezávislost jednorázové žádosti na marketingu. Vercel je označen jako plánovaný, nikoli tvrzený již aktivní hosting.
- `src/lib/privacy.ts` obsahuje uživatelem určené jméno, datum a nezávislé `PRIVACY_CONTACT_EMAIL`. Validuje adresu, bezpečně kóduje mailto a bez adresy vrací null. Nečte doručovací klíče a neexistuje fallback na odesílatele. Stránka je staticky připravená; změna prostředí vyžaduje rebuild.
- Právní základ nebyl svévolně vydáván za uzavřenou smlouvu či prokázaný souhlas. Je jasně označen jako bod pro potvrzení správcem, odděleně pro doručení a ochranu. Docs/privacy-review.md obsahuje podklady pro posouzení a přesný seznam potřebných informací. Proto je stránka dosud výslovně označena jako nedokončená pro veřejný sběr, ačkoli technicky funguje.
- Nově ověřeno, že veřejné Vercel DPA vymezuje působnost pro Pro/Enterprise. Uživatel byl na tento důležitý bod upozorněn v průběhu práce. Použitelnost pro plánovaný Hobby se nepředstírá; má ji ověřit vlastník u poskytovatele, případně zvolit vhodný tarif/hosting. Nebyla objednána placená služba ani měněn plán.
- Přepsány pouze informační texty u obou EmailForm a přidán Link na novou cestu; také informační sekce a patička landing page. Doručovací logika, checkboxy a tokenové stavy se neměnily. Doplněny styly v současné paletě a typografii.
- Preventivní souhlasový checkbox nepřidán: informační povinnost sama není souhlas. Banner nepřidán, protože nebyly nalezeny vlastní netechnické cookies; nastavení třetích stran a skutečný produkční browser audit zůstává k ověření. Není tvrzeno, že banner nebude nikdy potřeba při jiném nastavení.
- Aktualizovány README, docs/email-delivery.md a nová docs/privacy-review.md. Původní auditní záznamy zůstávají historickým popisem svého okamžiku.

## Ověření, výsledky a skutečné chyby

- Doplněny tři testy konfigurace a serverového renderu stránky (včetně null kontaktu, žádného soukromého fallbacku, URL kódování, práv, neuzavřených bodů a absence formuláře/widgetů). Doplněn test obou formulářových textů a odkazu bez checkboxu. Testy používají existující TypeScript transpileModule, React server renderer a mockované hooky, ne externí závislost či reálné e-maily.
- První npm test: 56/57. Nový test nesprávně očekával malá písmena atributu datetime v serializovaném React HTML. Změněn na kontrolu platného time atributu bez rozlišování velikosti písmen; aplikace se kvůli tomu neměnila.
- Následný kompletní npm test: **57/57**, npm run lint: **exit 0**. Existující neblokující Node MODULE_TYPELESS_PACKAGE_JSON varování zůstává.
- Produkční příkaz `$env:NODE_OPTIONS='--use-system-ca'; npm run build -- --webpack`: **exit 0**, včetně TypeScriptu, statické nové stránky a obou dynamických mail endpointů. Windows Application Control nově blokoval nativní SWC modul. Next stáhl svůj standardní WASM fallback do systémové cache a build dokončil. Žádná politika ochrany nebyla vypnuta a package.json/lockfile se nezměnily. Turbopack se v tomto kroku znovu nespouštěl.
- Lokální produkční server na 127.0.0.1:3010. Nová stránka ověřena v prohlížeči při 390 a 375 px; šířka dokumentu se scrollbarem 375 a 360 px, scrollWidth shodná, bez horizontálního přetékání. Vizuálně zkontrolován mobilní i desktopový náhled. Ověřen jediný h1, cíle obsahových odkazů, při přímém otevření žádné externí script src, iframe ani form v této stránce. Jde o omezenou kontrolu konkrétního lokálního náhledu, ne potvrzení skutečné produkční konfigurace či všech cookies.
- Zpáteční navigace na kalkulačku i odkazy z reportového a guide formuláře skutečně otevřely novou cestu se správným titulkem. Nic se nevyplňovalo ani neodesílalo a nebyl řešen CAPTCHA challenge. Screenshot desktopu uložen mimo repozitář do povolené vizualizační složky.
- Git diff pro investiční model, ETF data, src/lib/email, API routy, PDF a balíčky zůstal prázdný. Změny ve formuláři jsou pouze import Link a informativní text.
- Závěrečná kontrola 53 existujících kandidátních souborů a 36 klientských assetů proti skutečným lokálním hodnotám serverových klíčů a adresy odesílatele: 0 shod. Hodnoty byly porovnány pouze v paměti a nikdy vypsány; .env soubor není sledovaný a Git index zůstal prázdný. git diff --check bez chyb, jen běžná upozornění LF/CRLF. Server byl ukončen a viewport obnoven.

## Primární zdroje

Při práci byly otevřeny veřejné dokumenty EDPB k právním základům a právům, ÚOOÚ ke cookies, Resend DPA a dokumentace retence, Cloudflare Turnstile Privacy Addendum a DPA/pre-clearance a Vercel DPA/Privacy Notice. Přesné odkazy jsou na nové stránce a v docs/privacy-review.md. Byly ověřeny publikované informace, nikoli smlouvy nebo nastavení konkrétních účtů. Standardních 30 dnů u Resendu je výslovně údaj jeho dokumentace, ne vymyšlená lhůta aplikace.

## Zbývající překážky

Vlastník musí doplnit a ověřit kontakt, určit doložené právní základy, ověřit podmínky účtů a hostingové ujednání, retence, příjemce a přenosy a skutečné cookies/tracking. Přesný seznam je v docs/privacy-review.md. Do té doby není informační dokumentace připravená pro veřejný sběr. V této etapě nebyly změněny výpočty, bezpečnostní ověřování nebo odesílání a nevznikl newsletter, databáze, analytika, commit, push ani deployment. Žádný skutečný e-mail nebyl odeslán.
