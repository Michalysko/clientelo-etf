# Audit reklam A/B a dokumentace — 28. 10. 2026

## Skutečné zadání

Uživatel poskytl přesné texty reklam „Úspora na poplatcích“ a „Jednoduchý začátek“ a požadoval audit původně požadovaného URL parametru ad_variant a vstupu bez varianty, měření osmi událostí, funnel, pracovní konverzní cíl a tři prioritizované hypotézy. Dokumentaci dovolil upravit, měřicí chyby jen popsat a navrhnout bez implementace. Bez commitu, push, deploymentu a spuštění kampaní. Toto je pracovní souhrn a autentické krátké citace zadání, nikoli export konverzace. Export lze doplnit později.

## Provedený audit a nález

Výchozí git status byl čistý, základ 653798ec439a4323217943a47aafa8676bfbff20. Přečten src/lib/analytics.ts, analytics-provider.tsx, volání analytiky v calculator.tsx/email-form.tsx, příslušné testy a README/docs/analytics.md. Kampaň vzniká z allowlistu UTM. ad_variant je výstupní event property; stejně pojmenovaný vstupní query není podporovaný.

V paměti spuštěn skutečný createAnalyticsController s mock transportem pro pět vstupních URL: krátké ad_variant=A/B a holé / dávají unknown; utm_content=ad_a/ad_b dávají správné varianty. U každého scénáře ověřeno všech osm názvů událostí a material_accepted pro report i guide. Bez souhlasu kontroler poslal nula payloadů. Nejde o produkční Network kontrolu ani důkaz konfigurace dashboardu. Žádné skutečné e-mailové nebo Umami požadavky se neodesílaly.

Spuštěny existující analytics.test.mts, analytics-ui.test.mts a turnstile-ui.test.mts přes node --test --test-reporter=dot: 36 testů, exit 0. Mocky ověřují mimo jiné souhlas, zachování kontextu při interní navigaci, vynechání zastaralé konverze při nové kampani, bezpečnost payloadu a accepted pouze po 202. Testovací ani zdrojové soubory se neměnily. Build/lint nebyly znovu spouštěny, jde pouze o dokumentační změny.

## Rozhodnutí a výstupy

- Nový docs/ads-and-conversions.md: přesné reklamní texty beze změny, návrh publika/motivace, původně navržené odkazy a podporované UTM odkazy (následně sjednocené při finalizaci níže), tabulka pokrytí událostí a datových omezení.
- Nález byl uživateli oznámen před dokončením dokumentace. Návrh minimální opravy je explicitní whitelisted alias ad_variant → utm_content v campaignContext, s bezpečným řešením neplatných/duplicitních/konfliktních hodnot a přepnutí kontextu. Bez schválení nebyl implementován. Alternativou je použití stávajících UTM odkazů.
- Hlavní funnel ponechává kalkulačku volitelnou; povinná šestikroková posloupnost by nesprávně vyloučila některé platné konverze. Zvlášť popsán diagnostický kalkulačkový segment a hlavní dvoukroková metrika landing → accepted.
- Upozornění: material není na landing/calculator událostech, proto globální materiálový filtr může odstranit jmenovatel. Filtrování všech kroků reklamou/materiálem, jednotka reportu a deduplikace nejsou potvrzeny z účtu. Nezaměňovat event-count ratio za návštěvnický CR, nesčítat report a guide konverze stejného účastníka.
- Pracovní cíl 5 % je zvolená hypotéza s uvedenými předpoklady, ne benchmark, dosažený výsledek ani odhad z dat. 200 účastníků a 10 konverzí je jen výslovně označená aritmetická ilustrace, nikoli skutečný vzorek nebo dostatečný statistický plán. Tři budoucí experimenty mají samostatné metriky, očekávaný směr a prioritu.
- README a docs/analytics.md odkazují na nový dokument a popisují skutečný nesoulad URL. Žádné změny landing page, kalkulačky, dat, souhlasu, Resendu, idempotence, Turnstile či účtů.

## Primární podklady a hranice

Otevřena aktuální oficiální dokumentace https://docs.umami.is/docs/funnel, https://docs.umami.is/docs/event-data, https://docs.umami.is/docs/utm a https://docs.umami.is/docs/metric-definitions. Potvrzeno pořadí funnelu, Window mezi sousedními kroky, Events/Properties a UTM Views. Odkaz /docs/filtering nebyl nástrojem dostupný; z této chyby se nevyvozují produktové možnosti. Přihlášený účet ani produkční payloady nebyly kontrolovány. Žádná fiktivní data nebo statistická průkaznost nebyly vytvořeny.

V době původního auditu zbývalo schválit URL kontrakt a ručně ověřit reporty v Umami. Následné rozhodnutí vlastníka je zaznamenáno ve finalizaci níže. Žádné kampaně, commit, push ani deployment.

Doplňkový přímý scénář skutečného kontroleru: `utm_content=ad_a → ad_variant=ad_b` během otevřeného povoleného dokumentu ponechal na calculator_change původní ad_a, protože alias nevytváří nový kampanový kontext. Výsledek je zaznamenán v dokumentaci; kód nebyl opraven bez schválení. Závěrečný git diff --check prošel, změněny jsou pouze čtyři dokumenty.


## Finalizace podle výslovného schválení vlastníka — 28. 10. 2026

Vlastník schválil stávající řešení bez změny zdrojového kódu. Výhradní reklamní odkazy jsou [A](https://etf-kompas-zeta.vercel.app/?utm_content=ad_a) a [B](https://etf-kompas-zeta.vercel.app/?utm_content=ad_b). UTM Content je vstupní parametr utm_content; ad_variant je vlastnost pojmenované analytické události. Návrh aliasu uvedený výše je historická nezvolená možnost, ne otevřený implementační úkol. Aktuální dokumentace již neobsahuje nepodporované reklamní odkazy ani alternativní plné kampanové URL. Tyto odkazy samy neobsahují source/medium/campaign, proto se o platformě návštěvy nic nevymýšlí.

Sjednoceny docs/ads-and-conversions.md, docs/analytics.md, README a tento log. Přesné reklamní nadpisy, texty a CTA zůstaly beze změny. Zachován hlavní funnel, volitelné kalkulačkové události, pracovní hypotéza 5 % pro měřenou populaci, tři prioritizované experimenty a omezení souhlasové analytiky. Žádné zdrojové ani testovací soubory nebyly upraveny.

Po finalizaci znovu spuštěny analytics.test.mts, analytics-ui.test.mts a turnstile-ui.test.mts: 36/36 prošlo. Jednorázová kontrola v paměti potvrdila, že všech 10 výskytů cílových reklamních URL ve čtyřech dokumentech odpovídá výhradně dvěma schváleným odkazům; ověřila i všech šest přesných reklamních textů/CTA, hlavní funnel, volitelné události, 5 % a priority P1/P2/P3. git diff --check prošel. Zdrojový a testovací diff zůstává prázdný. Žádné reklamy, reálné e-maily, produkční analytické události, commit, push ani deployment.
