# Data ETF a výpočetní logika — 2026-10-26

Technické shrnutí skutečné práce, nikoli autentický přepis. Autentický export této konverzace zatím není uložen.

## Zadání a rozhodnutí

Uživatel požádal o ověření SPY/SPYM/VOO/IVV na oficiálních webech, samostatný model měsíčních vkladů, automatické testy, dokumentaci metodiky a omezení PRIIPs/KID. Zadal výchozí sazby ke kontrole a zakázal commit bez dalšího souhlasu. Jde o shrnutí promptu, nikoli doslovný export.

- `git status --short --branch`: na začátku čistá větev `master`. Přečteny `AGENTS.md`, `package.json`, `tsconfig.json` a lokální dokumentace Next.js pro TypeScript.
- `node --version`: v24.22.0. `node --help` potvrdilo podporu type stripping. Zvolen vestavěný `node:test` bez instalace závislostí. Důvod a metodika byly vysvětleny v chatu před implementací.
- Byly vytvořeny datový katalog, čistá výpočetní funkce a porovnání se společným hrubým výnosem. Zvolené konvence, validační limity a chyby jsou popsány v `docs/etf-data-and-model.md`.
- Upraven pouze testovací npm skript a povolení `.ts` importů v TypeScriptu; uživatelské rozhraní zůstalo beze změn.

## Skutečně použité zdroje a omezení získání

Vyhledávání a otevření pomocí webového nástroje dne 26. 10. 2026:

- SPY: https://www.ssga.com/us/en/individual/etfs/state-street-spdr-sp-500-etf-trust-spy — Fund Information/Listing Information k 26. 10. 2026, Gross Expense Ratio 0,0945 %, trustee.
- SPYM: https://www.ssga.com/us/en/individual/etfs/state-street-spdr-portfolio-sp-500-etf-spym — stejné sekce, 0,02 %, Investment Manager.
- VOO: https://workplace.vanguard.com/assets/corp/fund_communications/pdf_publish/us-products/fact-sheet/F0968.pdf — přímo otevřen aktuální factsheet k 30. 9. 2026; název, benchmark, burza a 0,03 %. Produktová stránka https://advisors.vanguard.com/investments/products/voo/vanguard-sp-500-etf?fromSearch=true&source=autosuggest byla v indexovaném výstupu vyhledávání čitelná včetně sekce Management (Vanguard Capital Management), ale přímé otevření vracelo prázdný text. Proto je hlavním zdrojem sazby factsheet.
- IVV: https://www.ishares.com/us/products/239726/ishares-core-sp-500-etf-ivv — 0,03 % dle aktuálního prospektu, benchmark, burza. Správce ověřen také v https://www.blackrock.com/us/individual/literature/prospectus/p-ishares-trust-us-sp-cap-non-sector-3-31.pdf (prospekt z 31. 7. 2026). Datum zavedení sazby nebylo na produktové stránce uvedeno a nebylo odhadováno.
- Změna SPLG → SPYM: https://www.ssga.com/library-content/products/fund-docs/etfs/us/information-schedules/ap-notice/notice-to-aps-ticker-fund-name-and-benchmark-index-name-changes-10-31-25.pdf — indexovaný oficiální dokument z 22. 10. 2025 uvádí účinnost 31. 10. 2025. Přímé otevření URL vrátilo 404; omezení je přiznané i v dokumentaci.
- PRIIPs: https://finance.ec.europa.eu/consumer-finance-and-payments/retail-financial-services/key-information-documents-packaged-retail-and-insurance-based-investment-products-priips_en a https://www.esma.europa.eu/sites/default/files/2023-05/JC_2023_22_-_Consolidated_JC_PRIIPs_Q_As.pdf . Přímé pokusy o otevření EUR-Lex (`/eli/reg/2014/1286/oj/eng` a CELEX 32014R1286) skončily na ochraně proti robotům; text nařízení tedy nebyl z těchto odpovědí čten.
- Praktické omezení retailových nákupů bez KID: https://www.lynxbroker.com/service/products-and-regulations/regulations/key-information-document/ . Neověřovala se individuální obchodní oprávnění pro každý fond/brokera.
- Technické zdůvodnění přímého spouštění TS: https://nodejs.org/api/typescript.html .

Vyhledávací dotazy mimo jiné: `site.ssga.com SPYM expense ratio 0.02 SPY 0.0945 official`, `site.vanguard.com VOO expense ratio NYSE Arca S&P 500`, `site.ishares.com IVV expense ratio 0.03 NYSE Arca`, `site.ssga.com SPLG SPYM October 31 2025 ticker change`, `site.ishares.com "IVV" "BlackRock Fund Advisors" investment adviser`, `site.esma.europa.eu PRIIPs KID retail investors`. Použity byly primární zdroje uvedené výše, nikoli finanční hodnoty z neoficiálních článků ve výsledcích vyhledávání.

## Kontroly a chyby

- První `npm test`: **27/27 prošlo**, návratový kód 0. Nezávislá kontrola používá uzavřenou geometrickou řadu, implementace měsíční rekurenci.
- Node vydal upozornění `MODULE_TYPELESS_PACKAGE_JSON`, protože projekt nemá explicitní `type: module` a testy importují `.ts` s ESM syntaxí. Testy proběhly úspěšně; konfigurace modulů celé aplikace nebyla kvůli upozornění měněna.
- Po revizi byl odstraněn jeden test pouze opakující konstanty katalogu, protože neověřoval aktuálnost zdrojů. Finální `npm test`: **26/26 prošlo**, návratový kód **0**. Testy výpočtu zůstaly zachovány.
- `npm run lint`: **0**, bez nálezů; zopakováno také po úpravě testů, opět **0**.
- První `npm run build` v sandboxu selhalo kódem **1**: Turbopack při zpracování výchozího `globals.css` nedokázal navázat spojení s pomocným Node procesem (`node process exited before we could connect to it`). Kód UI/CSS nebyl měněn.
- Po vyžádání oprávnění opakováno mimo sandbox: `$env:NODE_OPTIONS='--use-system-ca'; npm run build`. Výsledek **0**: úspěšná kompilace, kontrola TypeScriptu, generování statických stránek `/` a `/_not-found`. Systémové certifikáty zůstaly zapnuté pouze pro tento proces; ověřování TLS nebylo vypnuto.
- `git diff --check`: bez chyb; Git upozornil na budoucí převod LF na CRLF. Kontrola běžných vzorů soukromých klíčů/tokenů/autentizačních URL přes `rg` nad projektovými soubory mimo `.git`, `.next`, `node_modules` a favicon: bez nálezů (kód 1). Nejde o univerzální záruku detekce všech tajných údajů.
- `git status --short` ukázalo pouze zamýšlené změny: `README.md`, `package.json`, `tsconfig.json` a nové soubory v `ai-log`, `docs`, `src/data`, `src/lib`, `tests`. `package-lock.json` nezměněn, žádná závislost nebyla přidána.
- `git rev-parse HEAD` stále vrací `2f0aadff56ad9fe62fc209aa37070e7ddbfbba8b`. Nevytvořen nový Git commit ani vzdálený repozitář a nic neodesláno.

## Příprava schváleného commitu

Uživatel po nezávislé kontrole výslovně schválil commit `feat: add verified ETF data and investment calculation model`. Byly znovu přečteny změněné a nové soubory a zkontrolovány běžné vzory soukromých klíčů, tokenů, přihlašovacích údajů, autentizačních URL a e-mailů v osmi souborech: bez nálezů. Po přidání do indexu odhalilo `git diff --cached --check` nadbytečný prázdný řádek na konci testovacího souboru; odstraněn pouze tento řádek, bez funkční změny. Původní kontroly výpočtu, lintu a buildu jsou uvedeny výše. Žádné odeslání na GitHub není součástí tohoto kroku.
