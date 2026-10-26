# První funkční landing page — 2026-10-26

Toto je shrnutí skutečné práce, nikoli autentický export konverzace. Autentický export zatím není uložen; žádné smyšlené prompty ani zprávy nebyly vytvářeny.

## Zadání a návrh

Uživatel požádal o první mobilní landing page pro návštěvníky z reklamy, interaktivní porovnání SPY/SPYM/VOO/IVV se stávajícími daty a výpočtem, dvě poctivě označené e-mailové nabídky bez backendu, přístupnost, zdroje a upozornění na rizika/PRIIPs. Zakázal nový commit. Jde o shrnutí zadání; úplné znění patří do pozdějšího autentického exportu.

- Výchozí `git status --short --branch`: čistá větev `master` po dvou commitech. Přečteny `AGENTS.md`, existující page/layout/styly, datový katalog, výpočetní modul, package.json a lokální dokumentace Next.js o serverových a klientských komponentách.
- Vysvětlený směr před implementací: investiční pracovní stůl, teplý světlý podklad, tmavá zelená typografie a zelený akcent výsledku. Výrazný český nadpis doplňuje přímý vstup do kalkulačky; místo ilustrační fotografie používáme skutečné údaje a výsledek modelu.
- Použit postup skillu Sites pouze pro lokální práci v existujícím projektu: žádné založení Site, migrace frameworku, publikace ani hostingová konfigurace. Pro UI kontrolu použit podporovaný in-app browser přes `cua_repl`.

## Provedené změny

- Serverová stránka: hero, metadata v češtině, katalog čtyř fondů s rolí správce a zdroji, samostatná nabídka průvodce, upozornění na investiční rizika a omezení PRIIPs/KID. Katalog čerpá pouze z `src/data/etfs.ts`; data ani sazby nebyly změněny či znovu vydávány za nové ověření.
- Klientská kalkulačka: výchozí SPY/SPYM, měsíční vklad 5 000 Kč, 20 let a 7 % jako jasně označený předpoklad uživatele, nikoli finanční prognóza. Oba fondy sdílí hrubý výnos. Použita existující `compareInvestments`; metodika vkladů na konci měsíce i celý `src/lib/investment.ts` zůstaly beze změny.
- Okamžitá validace s českými chybami, desetinná tečka i čárka, odmítnutí neověřených sazeb a extrémního výsledku. Při neplatných vstupech se nezobrazuje zastaralý výsledek. Pořadí fondů neovlivňuje pravdivé označení, který má v modelu vyšší hodnotu.
- Součet vkladů, obě konečné hodnoty, absolutní rozdíl a označení modelového vítěze. Rozbalitelný SVG graf a roční tabulka včetně roku 0; plná/tečkovaná/přerušovaná čára odlišují řady i bez vnímání barev. Částky jsou pouze pro zobrazení zaokrouhleny na celé Kč.
- Dva oddělené formuláře se společnou komponentou: jedno povinné pole typu email, nativní validace, žádný fetch, úložiště, serverová akce ani backend. Odeslání je zachyceno lokálně a oznámí neaktivní doručování. Pole nemá atribut name, takže ani nativní odeslání před hydratací neobsahuje e-mail v URL. Nezobrazuje se falešný úspěch ani souhlas s neexistujícím zpracováním.
- Přístupnost: label/id, český jazyk stránky, skip link, logická struktura nadpisů, viditelné focus indikátory, status pro přepočet, popis grafu a tabulka s hlavičkami, klávesnicově přístupná posuvná tabulka, velké hlavní ovládací plochy, respektování reduced motion. Fonty Geist/Geist Mono využívají i latin-ext; žádná nová závislost. Přidána ikona kompasu.
- Zdroje: již ověřené URL emitentů z katalogu; vysvětlení PRIIPs vychází ze stávající dokumentace se zdroji Evropské komise a LYNX, na které stránka odkazuje. Datum verifikace je vykresleno z dat, nejde o živý feed.

## Chyby a průběžná ověření

- První velký `apply_patch` byl odmítnut kvůli dvěma operacím nad stejnou cestou v jediném patchi. Tento pokus nezměnil soubory; úpravy byly poté provedeny oddělenými platnými patchi.
- První `npm test`: 26/26 prošlo (kód 0), stávající upozornění Node `MODULE_TYPELESS_PACKAGE_JSON`. `npm run lint`: kód 0. Produkční build s `$env:NODE_OPTIONS='--use-system-ca'; npm run build` mimo sandbox: kód 0, TypeScript i statické generování úspěšné. Oprávnění mimo sandbox bylo vyžádáno na základě dřívějšího selhání Turbopack procesů v sandboxu; TLS nebylo vypnuto.
- Lokální náhled: `$env:NODE_OPTIONS='--use-system-ca'; npm run dev -- --hostname 127.0.0.1 --port 3000`, připravený server a stránka načtená v prohlížeči.
- V prohlížeči ověřeny všechny čtyři fondy, stejné fondy (nulový rozdíl), obrácené pořadí fondů (správné označení vyššího výsledku), vklad 0 i −1, horizont 0 i necelých 1,5 roku, záporný výnos −10 %, česká čárka 7,5 a kombinace maximálních vstupů překračující numerický limit. Výchozí výsledek odpovídal modelu: vklady 1 200 000 Kč, SPY 2 508 738 Kč, SPYM 2 531 525 Kč, rozdíl 22 787 Kč (zaokrouhleno).
- Otevřen graf a roční tabulka: 21 datových řádků pro roky 0 až 20. První dva pokusy otevřít summary přes přesný text/roli selhaly kvůli rozdílné reprezentaci details v DOM a nativní accessibility vrstvě. Po čerstvém DOM snapshotu použit existující selektor `details.trajectory > summary`, poté ověření prošlo. Nešlo o chybu rozbalování stránky.
- Oba formuláře ověřeny pouze syntetickou adresou: prázdné povinné pole není validní; validní vstup po kliknutí ukazuje, že výpis/průvodce nebyl odeslán ani uložen. URL zůstala bez e-mailu. Žádné osobní údaje nejsou součástí logu.
- Zkontrolovány viewporty o požadovaných šířkách 320, 390, 760, 1024 a 1440 px. Ve všech `scrollWidth === clientWidth` (15 px zabírá scrollbar). U mobilního viewportu 390 × 844 začínala kalkulačka přibližně 517 px od vrcholu stránky: vstup je v první obrazovce. V konzoli náhledu nebyly chyby ani warningy.
- Po kontrole drobně zlepšen focus uvnitř tmavého výsledku, zachování status regionu formuláře a přístup posuvné tabulky z klávesnice.

## Závěrečné ověření

- Závěrečné `npm test`: **26/26**, kód **0**; `npm run lint`: kód **0**, bez nálezů. Stávající neblokující warning Node o automatické detekci ESM zůstává.
- Závěrečný `$env:NODE_OPTIONS='--use-system-ca'; npm run build`: kód **0**, úspěšná kompilace i TypeScript, staticky vytvořeny `/`, `/_not-found` a `/icon.svg`.
- Vývojový server zaznamenal opakovaná `GET / 200` a byl ukončen Ctrl+C. Pro finální ověření spuštěno `npm run start -- --hostname 127.0.0.1 --port 3000`; produkční stránka načtena v prohlížeči, český titulek/jazyk, dvě formulářové nabídky a výchozí výsledek odpovídají zadání. Produkční server byl po kontrole také ukončen Ctrl+C.
- Rozbalení a zavření ročního průběhu ověřeno klávesou Enter; posuvná tabulka má `tabIndex=0`. V prohlížeči obnoveny výchozí vstupy a vyprázdněny testovací e-maily reloadem; dočasný viewport byl po testování resetován.
- Kontrolní screenshoty uloženy pouze jako ignorované buildové artefakty `.next/qa/landing-desktop.png` a `.next/qa/landing-mobile.png` (mobilní celá stránka). První mobilní screenshot byl nahrazen celostránkovým, protože viewportový snímek z in-app browseru zobrazoval zmenšený obsah s prázdným okolím; kontrola šířek vychází také z DOM metrik uvedených výše.
- `git diff --check`: bez chyb; pouze běžné upozornění na LF/CRLF. `git diff --numstat -- src/data/etfs.ts src/lib/investment.ts package.json package-lock.json`: prázdný výstup, tedy žádné změny těchto souborů.
- Kontrola běžných vzorů klíčů, tokenů a autentizačních URL přes `rg` ve zdrojích a nové dokumentaci: bez nálezů (kód 1). Nejde o univerzální záruku odhalení všech citlivých údajů.
- `git rev-parse HEAD`: stále `241e4e5d46c035c5e269a8b06518defe1da8cb90`. Změněny pouze související soubory UI/README a nový log. Nebyl vytvořen commit ani nic publikováno či odesláno.

## Co zůstává nehotové

Ukládání kontaktů, doručování výpisu/průvodce, samotný obsah/export těchto materiálů, skutečné zpracování osobních údajů a konverzní analytika nejsou implementované. Formuláře neprohlašují opak. Přístupnost byla zkontrolována strukturou HTML, klávesnicí a browserem, ne samostatným auditem všech asistivních technologií. Nebyla měřena skutečná konverzní výkonnost ani reálné Core Web Vitals.
