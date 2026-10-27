# Umami se souhlasem — 27. 10. 2026

## Skutečné zadání a podklady

Uživatel zadal: „Implementuj konverzní analytiku pomocí Umami Cloud s dobrovolným souhlasem návštěvníka.“ Dále výslovně požadoval zachovat výpočty/doručování, měřit osm pojmenovaných událostí, neodesílat osobní údaje a hodnoty scénáře, zachovat odmítnutí, umožnit odvolání, ověřit skutečný tracker a nepouštět commit/push/deployment ani reálné e-maily. Účet/region/Website ID poskytl vlastník. Toto je shrnutí skutečné práce a autentický krátký citát zadání, nikoli smyšlený export celé konverzace. Export zatím není uložen.

Přečten aktuální kód layout/page/calculator/email-form, server handler/providers/validation, testy a dokumentace. Přečten místní Next.js 16 průvodce `node_modules/next/dist/docs/01-app/02-guides/scripts.md`. Navázáno na předchozí read-only právní/technické audity. Nově ověřeny oficiální tracker configuration, Cloud FAQ, Funnel; hledaná stránka frameworks v dokumentaci nebyla dostupná. V účtu Umami se nic neměnilo a nebyl z něj čten výsledek reportů.

## Rozhodnutí a implementace

- Bez nových balíčků, klientský AnalyticsProvider s Next Script a produkčním guardem (NODE_ENV + VERCEL_ENV + přesný hostname).
- Rovnocenná tlačítka, lišta v toku stránky, trvalé ovládání pod patičkou, fokus a klávesnice. Preference localStorage: pouze verze, volba a čas na 180 dní. Nejde o návštěvnický identifikátor. Bez souhlasu žádný vendor script, observer, fronta historie nebo transport.
- Aktuální vendor script má auto-track/auto-pageview/performance vypnuté. Vlastní pageview + landing_view jednou na měřený vstup. Synchronní before-send rekonstruuje payload podle přesného allowlistu; identify/performance a neznámé vlastnosti odmítá.
- Sanitizace UTM hodnot i názvů, referrer jen známé originy, metadata screen/language/id/tag odstraněna; meta referrer=no-referrer a script referrerPolicy=no-referrer. HTTP IP/UA ani interní paměťový vendor cache tím nezmizí; zdokumentováno bez tvrzení anonymity.
- Odvolání nejprve blokuje gate/transport/frontu/pending analytické pokusy, potom reload odstraní vendor closure. Při selhání uložení chrání nový dokument fragment analytics-off; před obnovením staršího souhlasu se ověřuje možnost zapsat stejný záznam bez prodloužení platnosti. Již dispatchované požadavky nelze vzít zpět.
- Pole kalkulačky měřena na blur, bez hodnot, bez výchozího automatického eventu; select jen při změně. Form view přes IntersectionObserver; focus/pointer start jednou, pokus po validaci, přijetí jen 202 + accepted. První/opakovaný pokus je enum, interní čítače se neposílají. Provider chyby neovlivní doručování.
- E-mailové payloady, API endpointy, validace, Resend/Turnstile implementace, PDF a model beze změny. Filtrování funnelu podle kampaní není potvrzené z dashboardu; připravena jediná fallback vlastnost ad_variant a popsané ruční ověření. Žádná fiktivní měření.

## Skutečný vendor tracker a testy

Veřejný https://cloud.umami.is/script.js byl stažen do paměti a poté do dočasného souboru mimo repo. SHA256 kontrolované verze: `91A876D767646FD5B7701B6FABF97F8A99AE53B94E7E5B58D465BAD1E5D763E0`. Přímá kontrola potvrdila localStorage umami.disabled, browser metadata, gateway.umami.is/api/send, credentials=omit, memory cache a možnost vypnout automatickou inicializaci. Skript byl spuštěn pouze v izolované VM s fake browser objekty a mock fetch. VM ověřila skutečný before-send, jeden pageview, sanitizaci a stop po odvolání. Žádný analytický event do skutečného účtu.

Příkazy: `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build -- --webpack` s `NODE_OPTIONS=--use-system-ca`; pro skutečný vendor test byla jen v testovacím procesu nastavena cesta `UMAMI_TRACKER_TEST_FILE`. Běžné npm test bez dočasného vendor souboru přeskočí jeden explicitně volitelný test. V úplném finálním běhu s dočasným souborem: 75 testů, 75 prošlo, 0 selhání, 0 přeskočených. Resend je vždy mockovaný.

Nalezené a opravené chyby při práci: nový test nejprve použil TypeScript parameter property, kterou Node strip-only nepodporuje; nahrazeno běžnou vlastností. První Webpack build pak odhalil nevhodné typové zúžení testovacího pole po assert.deepEqual([], ...); změněno na kontrolu délky. Po opravě tsc a mezilehlý produkční build prošly. Po závěrečném zpřesnění souhlasu se kontroly opakují. Windows Application Control blokuje nativní SWC, Next používá WASM; ochrana ani závislosti nebyly měněny.

## Skutečné ověření v prohlížeči

Lokální `npm run dev -- --webpack`, port 3002, protože 3000 byl již obsazen. Produkční guard zůstal zapnutý, žádné povolení reálné analytiky na localhostu. Ověřeno 375 × 812 a 1440 × 1000: bez horizontálního přetékání, lišta static v normálním toku, rovnocenné plochy nejméně 44 px. DOM má dva formuláře, meta referrer=no-referrer a nula Umami scriptů před volbou i po povolení na localhostu. Odmítnutí skryje lištu; vklad 5000 → 10000 přepočte rozdíl na 45 574 Kč. Nastavení vrací fokus na nadpis, Tab vede na odkaz a tlačítka lze aktivovat Enter. Odvolání skutečně obnovilo stránku a vrátilo výchozí vstupy. Oba Turnstile widgety se následně samy ověřily bez ručního řešení; žádný formulář nebyl odeslán.

Konzole: v kontrolovaném zachyceném vzorku žádná first-party warning/error; vendor Cloudflare iframe zapisuje vlastní zamlžené warning/error zprávy. Jejich interní obsah nevydáváme za novou chybu analytiky ani za důkaz bezchybnosti celé produkce. Reálné HTTP hlavičky Umami z produkčního prohlížeče nebyly odchyceny; ověřena policy v DOM a transport contract v VM. Produkční Network, A/B reporty a konkrétní možnosti funnel filtrů zůstávají ručním krokem po schváleném deploymentu. Žádné reálné doručení e-mailu nebylo testováno.

## Omezení

Měří se pouze souhlasící a neblokované návštěvy. material_accepted znamená odpověď po přijetí Resendem, nikoli doručení, unikátní kontakt ani jedinečný odeslaný e-mail; idempotentní retry může také vrátit 202. Historické právní otevřené body poskytovatelů nejsou automaticky uzavřeny souhlasem s Umami. Aktuální cloudový script je měnitelný; upgrade vyžaduje opakované ověření. Není zde právní stanovisko ani slib všech údajů výhradně v EU.

Bez commitu, push, deploymentu, změn produkčních env/účtu a odesílání e-mailů.

## Dokončené finální kontroly

Po poslední opravě zápisu preference: úplné testy 75/75 (včetně vendor VM), ESLint exit 0, produkční Webpack build exit 0 včetně TypeScriptu a všech stránek. git diff --check bez chyb (jen běžné LF/CRLF upozornění). Kontrola 15 změněných/nových souborů proti skutečným hodnotám RESEND_API_KEY, TURNSTILE_SECRET_KEY a veřejného site key v ignorovaném lokálním prostředí a proti credential vzorům: bez nálezu, hodnoty nebyly vypsány. .env.local zůstává ignorován. Diff serverového e-mailového kódu/API, modelu, dat a package souborů je prázdný. Žádný commit ani staging.

Testovací dev server na 3002 byl po kontrole ukončen. V jeho terminálu byly při souběžném lokálním vývoji zaznamenány i Webpack cache ENOENT rename warningy v .next/dev/cache; HTTP odpovědi zůstaly 200 a produkční build prošel. Existující cizí proces na portu 3000 nebyl ukončen.
