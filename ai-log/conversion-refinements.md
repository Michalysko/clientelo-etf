# Cílené konverzní úpravy — 2026-10-26

Technické shrnutí skutečné práce, nikoli autentický export. Úplný export konverzace zatím není uložen. Uživatel požádal o zkrácení mobilního hero, větší důraz na modelovaný rozdíl, kratší selecty, konkrétní popis budoucího výpisu a kontrolu přístupnosti/šířek 390 a 375 px. Požadoval zachování identity a desktopových dvou sloupců, bez commitu a nových závislostí. Toto je shrnutí promptu, nikoli jeho smyšlený doslovný přepis.

## Výchozí stav a provedené změny

- `git status --short --branch` potvrdilo větev `master` a již existující necommitované změny první landing page. Nebyly rušeny ani resetovány. Přečteny `AGENTS.md`, komponenty, styly a relevantní lokální dokumentace Next.js pro serverové/klientské komponenty.
- `src/app/page.tsx`: dlouhé upozornění bylo skutečně přesunuto v DOM za kalkulačku do společného pravého sloupce. Na desktopu zůstala dvousloupcová mřížka; na mobilu návštěvník vidí kalkulačku dříve. Nedochází k rozporu vizuálního pořadí a pořadí čtení pomocí CSS order.
- `src/app/globals.css`: pouze cílené změny rozestupů mobilního hero, velikostí částek, zvýraznění rozdílu a popisu výpisu. Původní barevné proměnné, rodiny fontů, nadpis a desktopová mřížka zůstaly zachovány.
- `src/components/calculator.tsx`: rozdíl je první hlavní údaj výsledku, před součtem vkladů a konečnými hodnotami fondů. Označen jako modelovaný rozdíl v konečné hodnotě; kontext uvádí společný hrubý výnos a vliv nákladovosti, bez garance či tvrzení o skutečném budoucím výnosu. Rozdíl větší než nula a menší než 1 Kč se zobrazí jako „Méně než 1 Kč“, nikoli jako zavádějících 0 Kč.
- Selecty zobrazují pouze tickery z existujícího katalogu. Úplné názvy, správci, nákladovost a zdroje zůstaly v detailech fondů; nebyly vytvářeny duplicitní finanční údaje.
- Výsledek výslovně uvádí modelový charakter, absenci investičního doporučení a zaručeného výnosu; přidán přímý odkaz na stávající vysvětlení PRIIPs/KID.
- U primárního formuláře je text budoucí nabídky: roční přehled investice, porovnání poplatků obou ETF a předpoklady výpočtu. Komponenta formuláře a její neaktivní doručování nebyly změněny. Backend ani ukládání kontaktů nebyly přidány.

## Automatické kontroly

- `npm test`: **26/26 prošlo**, návratový kód **0**. Přetrvává dříve zaznamenané neblokující upozornění Node `MODULE_TYPELESS_PACKAGE_JSON`.
- `npm run lint`: návratový kód **0**, bez nálezů.
- `$env:NODE_OPTIONS='--use-system-ca'; npm run build`: návratový kód **0**, úspěšná kompilace, TypeScript a statické generování. Běh mimo sandbox byl vyžádán kvůli dříve prokázaným omezením pomocných procesů Turbopacku a síťovému stažení fontů. TLS zůstalo ověřované.
- `npm run start -- --hostname 127.0.0.1 --port 3000`: produkční server byl připraven a stránka úspěšně načtena podporovaným in-app browserem přes `cua_repl`.

## Kontrola mobilu a přístupnosti v prohlížeči

- Požadovaný viewport **390 × 844**: obsah má šířku 375 px po odečtení 15px scrollbarů; `scrollWidth = clientWidth = 375`. Kalkulačka začíná přibližně **409 px** od vrcholu. Předchozí zaznamenané měření stejného viewportu bylo přibližně 517 px — posun o **108 px výše**.
- Požadovaný viewport **375 × 844**: `scrollWidth = clientWidth = 360` po odečtení scrollbarů. Kalkulačka začíná přibližně **403 px** od vrcholu. Žádné horizontální přetékání.
- Na obou mobilních šířkách je rozdíl velký **38 px**, konečné hodnoty přibližně **19–20 px**. Selecty zobrazují celé SPY/SPYM; mají výšku **44 px**, vstupy alespoň **49 px**. Kontrola DOM i vizuálního náhledu, ne pouze CSS předpoklad.
- Desktop **1440 × 1100**: mřížka má dva sloupce přibližně 544 a 664 px; kalkulačka i levý obsah začínají na stejné výšce. Rozdíl **44 px**, konečné hodnoty **24 px**. `scrollWidth = clientWidth = 1425`, bez přetékání.
- Ověřen výběr stejného fondu (0 Kč), rozdíl pod 1 Kč, označení neplatného vkladu přes `aria-invalid` a česká chyba. Výchozí čísla po návratu ke scénáři zůstala stejná jako před úpravou.
- Roční průběh otevřen/zavřen klávesou Enter. Posuvná tabulka zachovává `tabIndex=0`; labely vstupů, stavové zprávy a odkazy na zdroje zůstaly dostupné. Odkaz na PRIIPs/KID je přímo u výsledku, vysvětlení je nadále na stránce.
- Primární formulář ověřen syntetickou adresou: ukázal, že výpis nebyl odeslán ani uložen. Před snímky byl náhled reloadován, aby nezůstala vyplněná testovací adresa. Konzole bez chyb a warningů.
- Snímky uloženy jako ignorované artefakty v `.next/qa/conversion-desktop.png`, `.next/qa/conversion-390.png` a `.next/qa/conversion-375.png`. Dočasný viewport prohlížeče byl resetován.

## Rozsah ověření

Není provedeno měření skutečných konverzí ani samostatný audit všech asistivních technologií. Jde o cílené úpravy a kontrolu chování/rozvržení. Výpočetní metodika a ETF data nebyly měněny; žádná závislost nebyla přidána. Nebyl vytvořen Git commit ani provedeno nasazení.

Závěrečné `git diff --check` bez chyb (pouze upozornění na LF/CRLF); diff výpočetního modulu, katalogu a obou npm manifestů je prázdný. HEAD zůstává `241e4e5d46c035c5e269a8b06518defe1da8cb90`. Produkční náhled byl po ověření ukončen Ctrl+C.

## Následná příprava schváleného commitu

Uživatel následně výslovně požádal o commit `feat: build responsive ETF comparison landing page`. Zkontrolovány Git stav, diff a devět souvisejících souborů včetně obou nových AI logů. Kontrola běžných vzorů soukromých klíčů, přístupových tokenů, hesel a autentizačních URL byla bez nálezů. `.next` včetně screenshotů, `node_modules`, `.env`, `.env.local`, `.npmrc` a `*.key` zůstávají ignorované (ověřeno `git check-ignore -v`). V indexu před přípravou nebyly žádné jiné změny; vzdálený repozitář není nastaven. Funkční kód nebyl při přípravě commitu měněn. Testy, lint a build již pro tuto implementaci prošly v předchozím kroku; kvůli samotnému commitu nebyly znovu spouštěny. Výsledek commitu a čistota pracovního stromu budou ověřeny po jeho vytvoření a oznámeny v chatu. Nic se neodesílá na GitHub.
