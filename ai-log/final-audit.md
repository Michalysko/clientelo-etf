# Závěrečný audit před commitem — 26. 10. 2026

## Zadání a rozsah

Uživatel požádal o audit formulářů, bezpečnosti, HTML reportu, PDF, dokumentace a buildu bez rozsáhlých funkcí. Výslovně zakázal další skutečné e-maily, commit a deployment. Potvrdil, že oba dřívější e-maily dorazily a jejich obsah zkontroloval. Toto ruční ověření je informace uživatele, nikoli provedený test agenta. Aktuální záznam je souhrn skutečné práce, nenahrazuje autentický export konverzace a nevymýšlí prompty ani výsledky.

Před úpravou přečteny AGENTS.md, relevantní lokální Next dokumentace, PDF skill, existující implementace a testy. Žádná nová závislost. Architektura, barvy, typografie, desktopové dva sloupce a model vkladů na konci měsíce zůstaly zachovány.

## Zjištění a opravy

1. Formulář po získání tokenu stále žádal dokončení ověření. Stavový text nyní odpovídá získanému tokenu a připravenosti skriptu. Tlačítko navíc vyžaduje ready bez chyby společného loaderu.
2. Nativní HTML validace není totožná se serverovou (např. doména bez tečky). Před fetch se nyní použije stejná čistá funkce validEmail jako na serveru; neplatný e-mail nemůže spotřebovat požadavek. Přidáno aria-invalid, propojení popisu s chybovým hlášením a zaměření pole při této chybě. HTML required/type=email zůstává.
3. U hlavního výsledku webu i reportu doplněno, že modelovaný rozdíl konečných hodnot není částkou skutečně zaplacených poplatků. HTML a textová alternativa obsahují stejný význam. Metodika ani finanční údaje se nezměnily.
4. PDF chyběla závěrečná výzva k návratu. Doplněn výrazný blok v současné zelené a slovní návrat na původní stránku. Produkční URL není vymyšlena: zřetelně je uvedeno doplnění po deploymentu. README popisuje změnu skutečného odkazu ve skriptu, regeneraci a novou kontrolu PDF.
5. Úplné informace o správci a zpracování údajů dosud neexistují. Stránka neúplnost viditelně označuje; docs/email-delivery.md obsahuje seznam pro vlastníka (identita/kontakt, právní základ, retence u poskytovatelů, příjemci/přenosy, práva a jejich uplatnění). Nejsou doplněny žádné smyšlené osobní či firemní údaje.

## Formuláře, server a testy

- Audit potvrdil serverovou allowlist validaci scénáře a ETF, odmítnutí honeypotu, limit 8192 bajtů, kontrolu originu, povinné serverové Siteverify s hostname i action a přepočet stejnou compareInvestments jako web. Klientské výsledky ani sazby se nepřijímají.
- Odeslání zůstává za úspěšným ověřením. Nový test výslovně pro oba druhy materiálu kontroluje prázdný/neplatný e-mail, honeypot, chybějící token a odmítnutou/výpadkovou verifikaci: žádné send se neprovede.
- Rozšířen izolovaný hook harness o prázdné a neplatné adresy, aria feedback, zadržený mockovaný fetch pro souběžný dvojklik, pending a odpovědi 400/403/429/500/503 i síťovou chybu u obou formulářů. Testy ověřují absenci falešného úspěchu, reset tokenu a nezávislost instancí. Harness není kompletní implementace React DOM ani živého Cloudflare klienta.
- Resend idempotence nadále odvozuje neprůhledný HMAC klíč z kompletního obsahu včetně adresáta a PDF. Přidána kontrola, že změna přílohy mění klíč. Platnost idempotence není rate limiter: různí adresáti/scénáře mohou vytvářet další zprávy; schválená varianta bez distribuovaného limiteru nemá tvrdý rozpočet ani per-IP limit.
- Jednorázové zaslání nemá žádnou větev aktivující newsletter nebo ETF Hlídače. Žádná databáze, cron ani analytika nepřibyla.

Spuštěno npm test: nejdříve 52/52, po doplnění kontroly obou handlerů konečně **53/53**, bez síťového odesílání. npm run lint prošel, včetně opakování po změně testů. Node nadále vypisuje neblokující MODULE_TYPELESS_PACKAGE_JSON. Testy nečtou .env.local; poskytovatelé jsou mockovaní.

## PDF a HTML náhled

Pro editaci byl přesně jednou spuštěn PDF artifact marker. Generátor ReportLab spuštěn bundlovaným Pythonem. První dvě úpravy převedly závěrečný text na osmou stranu; assert sedmi stran chybu odhalil. Zkrácena závěrečná výzva a zmenšeny pouze mezery mezi zdroji při zachování čitelného 9bodového písma. Finální generování: **7 stran, 128005 bajtů**.

pdftoppm vytvořil náhledy; vizuálně prohlédnuto všech sedm finálních stran, včetně poslední CTA, číslování, diakritiky a tabulek. Pypdf potvrdil devět HTTPS link anotací, žádné náhradní glyfy a přítomnost CTA i upozornění na budoucí odkaz. Všechny cíle devíti zdrojových odkazů byly otevřeny webovým nástrojem: Investor.gov, S&P DJI, Vanguard, iShares, Evropská komise, LYNX, State Street SPY/SPYM a ESMA. Zůstávají to původní vzdělávací zdroje, žádné nové výnosové tvrzení. PDF stále načítá guide route z pevné soukromé cesty; produkční route.js.nft.json obsahuje soubor pro přibalení.

Produkční stránka byla spuštěna lokálně na 3010; syntetický HTML report bez příjemce na 3011. Oba náhledy zkontrolovány v prohlížeči při 375 a 390 px: žádné horizontální přetékání. Kvůli scrollbarům byly skutečné šířky dokumentu 360 a 375 px. Stránka má dvě pojmenované form sekce, unikátní ID, popisky pro obě povinná email pole a propojená hlášení. Tlačítka mají přibližně 51 px na výšku. Report obsahoval 21 řádků (roky 0–20), české částky a explicitní vysvětlení hlavního rozdílu.

Cloudflare v tomto testovacím prohlížeči zobrazil „Nelze se připojit k webové stránce“ a Turnstile varování. Widgety byly vykreslené, oba formuláře zobrazily chybu a tlačítka zůstala blokovaná. Neproběhlo řešení challenge ani žádné odeslání formuláře; neinterpretuje se to jako nové úspěšné integrační ověření. HTML náhled není úplným testem Gmail/Outlook a dalších klientů. Screenshoty byly pořízeny do ignorované .next/qa a zobrazeny v nástrojovém výstupu; následný finální build je odstranil. Dočasné PDF náhledy tohoto auditu byly po vizuální kontrole uklizeny. Dočasné servery byly ukončeny a viewport resetován.

## Build a Turbopack

Přečten předchozí panic log a reprodukováno npm run build mimo sandbox s NODE_OPTIONS=--use-system-ca. Stejný problém: pomocný proces pro zpracování globals.css skončí s exit 0 před připojením IPC. Log neuvádí konkrétní důvod ukončení; nelze tvrdit, že je definitivně znám nebo opraven. Shodný symptom je hlášen přímo v repozitáři Next.js: https://github.com/vercel/next.js/discussions/94693 . To samo neprokazuje příčinu na tomto počítači.

Bez aktualizace závislostí použit npm run build -- --webpack s NODE_OPTIONS=--use-system-ca. Build prošel, včetně finálního opakování po přidání serverového testu: kompilace, TypeScript, statické stránky a tracing. Nejde o vypnutí TLS ověřování. Výchozí build skript se neměnil. Před veřejným provozem je nutné ověřit build i skutečný runtime na cílovém hostingu.

## Git a citlivé údaje

Index byl při auditu prázdný; nebyly provedeny stage ani commit. Kontrolovány všechny existující sledované i nové neignorované kandidátní soubory, nikoli jen výstup git diff, který nové soubory neukazuje. Balíčky a lockfile se nezměnily.

Kontrola 47 kandidátních souborů a 34 klientských assetů proti skutečným lokálním hodnotám Resend klíče, Turnstile secret a adresy odesílatele: 0 shod. Hodnoty byly porovnány pouze v paměti a nikdy vypsány. Doplňkový scan běžných formátů privátních klíčů/tokenů: 0 nálezů; žádný zakázaný konfigurační soubor mezi kandidáty. Aplikační src neobsahuje žádná console log/info/warn/error/debug volání. Finální kontrola po dopsání tohoto záznamu a buildu: 48 kandidátních souborů a 34 klientských assetů, opět 0 shod skutečných tajemství/adresy odesílatele; index prázdný a PDF potvrzeno v tracingu. Nejde o záruku neexistence všech možných tajemství neznámého formátu nebo audit provozních logů poskytovatelů.

git check-ignore ověřil .env.local, .env.production, .npmrc, privátní .key, node_modules, .next a tmp. Git nesleduje .env soubory. Do logů se neukládají adresy příjemců ani request body; syntetické testy používají pouze example.com. git diff --check bez chyb, pouze běžná Windows upozornění LF/CRLF.

## Výsledek a zbývající kroky

Technický obsah je připraven k review a následnému commitu; žádný commit nebyl vytvořen. Pro veřejný sběr kontaktů je nejprve třeba doplnit skutečné informace o správci a zpracování údajů (podklad: https://www.edpb.europa.eu/sme/be-compliant/respect-individuals-rights_en), produkční origin a Turnstile hostname, skutečný PDF odkaz a ověření cílového hostingu. Zůstává vědomé omezení bez distribuovaného rate limitingu a nevyřešený výchozí Turbopack build s ověřenou Webpack alternativou. Poslední textové změny a nové PDF nebyly znovu skutečně doručovány; ověřeny lokálně a mockovanými testy.

Soubory upravené tímto auditem: README.md, docs/email-delivery.md, src/app/page.tsx, src/components/calculator.tsx, src/components/email-form.tsx, src/lib/email/content.ts, scripts/build-etf-guide.py, output/pdf/etf-od-nuly.pdf, tests/email.test.mts, tests/turnstile-ui.test.mts a tento ai-log/final-audit.md. Dřívější necommitnutá implementace zůstala zachována.
