# ETF Kompas

Konverzní landing page pro českého drobného investora, který přichází z mobilní reklamy a během několika sekund potřebuje pochopit rozdíly v nákladovosti ETF. Praktické zadání **B** pro výběrové řízení Junior AI Developer ve společnosti Clientelo.

**[Otevřít živou aplikaci](https://etf-kompas-zeta.vercel.app/)** · Next.js 16, React, TypeScript, Tailwind CSS · bezplatný hosting Vercel Hobby.

**Demonstrační režim:** kalkulačka je veřejná, HTML report a PDF průvodce se skutečně odesílají přes Resend pouze předem schváleným testovacím příjemcům. Nepovolená adresa není předána Resendu. Projekt není právně schválenou veřejnou službou; reklamní kampaně neproběhly a nejsou k dispozici naměřené konverzní výsledky z kampaní.

## Rychlé vyzkoušení

1. Otevřete web, změňte měsíční vklad, horizont nebo předpokládaný hrubý výnos a porovnejte dvě ETF. Kalkulačka funguje bez e-mailu i bez analytického souhlasu.
2. Rozbalte roční průběh a metodiku; u fondů najdete odkazy na zdroje emitentů.
3. Přes úvodní odkazy přejděte k reportu nebo průvodci. Skutečné doručení lze ověřit jen schválenou testovací adresou po Turnstile ověření. Zpráva o přijetí není potvrzením doručení do schránky.

## Cílová skupina a konverzní strategie

Cílíme na české začínající drobné investory: část už zná ETF a řeší poplatky, část potřebuje nejprve srozumitelné vysvětlení. Americká ETF slouží ke vzdělávacímu porovnání, nikoli jako doporučení k nákupu; jejich dostupnost českému retailu omezuje PRIIPs/KID.

Pořadí odpovídá návštěvě z mobilní reklamy:

1. **Úvod, nabídka obou materiálů a okamžitý výsledek.** Nadpis navazuje na rozdíl poplatků, přímé odkazy zpřístupňují i průvodce. Modelové předpoklady jsou u výsledku, aby číslo nebylo bez kontextu.
2. **Nastavení investice a výběr ETF.** Návštěvník si výsledek přizpůsobí; nemusí nejprve vyplňovat vstupy, aby poznal hodnotu stránky. Desktop zachovává dva sloupce, mobil stejnou posloupnost obsahu.
3. **Nabídka personalizovaného reportu.** O kontakt žádáme po ukázce konkrétního výsledku a vysvětlení obsahu reportu; následuje rozbalovací metodika.
4. **Fondy a zdroje, potom samostatný průvodce.** Zdroje podporují důvěryhodnost, průvodce nabízí vzdělávací cestu i bez změny kalkulačky. Závěr obsahuje rizika, dostupnost ETF, informace o soukromí a patičku.

Formuláře mají jediné povinné viditelné pole: e-mail. Turnstile je povinná bezpečnostní kontrola. Obě nabídky jsou na stránce dostupné všem, doručování je však omezené demonstračním režimem. Nevzniká automatický newsletter ani ETF Hlídač.

## Dvě reklamní varianty

Obě reklamy vedou na totožnou stránku. Testoval by se příslib reklamy, nikoli dvě verze webu; kampaně nebyly spuštěny.

| | A — Úspora na poplatcích | B — Jednoduchý začátek |
| --- | --- | --- |
| Nadpis | Stejný index. Různé poplatky. Kolik vás stojí rozdíl? | Chcete investovat do ETF, ale nevíte, který vybrat? |
| Text | Dva ETF fondy mohou sledovat stejný index, ale mít rozdílné náklady. Spočítejte si, jak se mohou projevit za 20 let. | Porovnejte čtyři známé ETF, pochopte rozdíly a získejte zdarma průvodce pro začátečníky. |
| CTA | Spočítat rozdíl zdarma | Porovnat ETF zdarma |
| Cílový odkaz | [Varianta A](https://etf-kompas-zeta.vercel.app/?utm_content=ad_a) | [Varianta B](https://etf-kompas-zeta.vercel.app/?utm_content=ad_b) |

A navazuje na modelovaný dopad nákladovosti a report, B na srozumitelné porovnání a průvodce. `utm_content` je vstupní URL parametr; `ad_variant=ad_a/ad_b/unknown` je odvozená vlastnost analytické události, nikoli vstupní parametr. Podrobný [reklamní a konverzní plán](docs/ads-and-conversions.md) obsahuje pravidla férového porovnání.

## Kalkulačka, data a materiály

- **Čtyři ETF:** SPY, SPYM (dříve SPLG), VOO a IVV; S&P 500, NYSE Arca. Ruční snímek nákladovosti ověřený 26. 10. 2026: 0,0945 %, 0,02 %, 0,03 % a 0,03 % ročně. Zdroje State Street, Vanguard a iShares/BlackRock, role správců a data podkladů jsou v [katalogu](src/data/etfs.ts) a [dokumentaci dat](docs/etf-data-and-model.md). Nejde o živý feed ani o nové ověření sazeb při každém buildu.
- **Čistý model:** [modelInvestment / compareInvestments](src/lib/investment.ts) začíná od nuly, oba fondy mají stejný hrubý výnos. Měsíční faktor je `((1 + g) × (1 − f))^(1/12)`; nejprve růst, potom vklad na konci měsíce. Výnosy se reinvestují. Výchozích 5 000 Kč měsíčně, 20 let a 7 % je ilustrativní předpoklad. Rozdíl konečných hodnot není součet skutečně zaplacených poplatků. Model nezahrnuje daně, inflaci, kurzové změny ani náklady brokera a negarantuje výnos.
- **Primární lead magnet:** personalizovaný HTML report s textovou alternativou, ročním přehledem, nákladovostí, metodikou a zdroji. Server přepočítá validované vstupy stejným modelem; nepřebírá klientské výsledky.
- **Sekundární lead magnet:** sedmistránkové PDF „ETF od nuly: 7 věcí, které byste měli vědět před první investicí“ s příklady, riziky a zdroji, zaslané jako příloha. [Hotové PDF](output/pdf/etf-od-nuly.pdf) je verzované mimo `public/` a build je přibalí do serverové funkce; produkce Python nepotřebuje. Případné zveřejnění repozitáře zpřístupní i PDF.

## Měření a vyhodnocení

Umami Cloud se načte pouze po dobrovolném souhlasu a jen v povolené produkci. Localhost a preview události neposílají. Odmítnutí neomezuje používání aplikace. Povolení platí v aktuálním dokumentu; po reloadu je nutné nové potvrzení. Odmítnutí se pamatuje nejvýše 180 dní. Nastavení je pod patičkou; odvolání ihned zastaví další měření a při úspěšném uložení odmítnutí obnoví stránku. Aktivity před souhlasem se zpětně neposílají.

| Událost | Význam |
| --- | --- |
| `landing_view` | První měřený vstup na landing page |
| `calculator_change` | Dokončená platná změna parametru na blur, bez hodnoty |
| `etf_change` | Skutečná změna vybraného ETF |
| `form_view` | Observer potvrdil alespoň 10 % formuláře ve viewportu |
| `form_start` | První focus/pointer interakce, emitovaná až po `form_view` |
| `form_submit` | Pokus po klientské validaci těsně před POST |
| `material_accepted` | HTTP 202 a `status=accepted` po potvrzení Resendem |
| `form_error` | Obecná kategorie neúspěchu, bez interních podrobností |

Hlavní funnel: **landing_view → form_view → form_start → form_submit → material_accepted**, zvlášť `report` a `guide`. Změna kalkulačky je volitelná. Demo odmítnutí není běžná validační chyba ani konverze. Jeden pageview a vlastní `landing_view` se nesčítají jako dvě návštěvy.

Do analytiky neposíláme e-maily ani jejich hashe, investiční hodnoty, UUID žádostí, tokeny či libovolné URL parametry. Používáme whitelist událostí a kampaní. Umami přesto zpracovává síťová metadata a odvozené identifikátory; nejde o zcela anonymní měření.

**Implementované události nejsou důkazem ověřeného dashboardu:** filtry variant na celé cestě, materiálové filtry jednotlivých kroků a jednotku deduplikace je nutné potvrdit v účtu Umami. Globální filtr `material` by mohl odstranit společný `landing_view`. Přijetí není doručení, unikátní kontakt ani vždy nový e-mail; idempotentní retry může vrátit původní potvrzení. Prostý poměr počtů událostí není návštěvnický konverzní poměr. Měření zahrnuje pouze souhlasící, neblokované a technicky zaznamenané aktivity. Podrobnosti: [analytika](docs/analytics.md).

### Pracovní cíl a další experimenty

**5 % je pracovní hypotéza**, nikoli naměřený výsledek, benchmark nebo příslib. Znamená podíl měřených účastníků s alespoň jedním `material_accepted`, se stejnou jednotkou a obdobím v čitateli i jmenovateli. Předpokládá relevantní publikum, užitečný bezplatný materiál a běžně dostupné doručování. Současný allowlist neumožňuje tento cíl ověřit na běžném reklamním publiku.

Tři budoucí experimenty, seřazené podle odhadovaného dopadu; nebyly realizované:

| Priorita | Test a důvod | Hlavní metrika | Hypotéza |
| --- | --- | --- | --- |
| P1 | Současný nadpis vs. stručnější vysvětlení stejného indexu a modelovaného rozdílu; rychlejší pochopení na mobilu | Celkový CR `landing_view → material_accepted` | Srozumitelnější sdělení zvýší CR |
| P2 | Odstavec o reportu vs. tříbodový výčet ročního přehledu, nákladovosti a předpokladů u CTA | CR `form_view → material_accepted` pro report | Konkrétnější hodnota zvýší reportový CR |
| P3 | Představení průvodce vs. čitelná ukázka skutečného obsahu | CR `form_view → material_accepted` pro guide | Ukázka sníží nejistotu a zvýší průvodcový CR |

Porovnávat stejné publikum, období a podmínky; hlídat celkový CR, chyby, rychlost a přístupnost. Součet konverzí obou materiálů není počet různých lidí. Bez skutečné kampaně a nákladů nelze určit vítěze ani cenu za kontakt.

## Připravenost na spuštění reklamní kampaně

**ETF Kompas má funkční a otestovaný základ pro spuštění reálné reklamní kampaně.** Landing page je veřejně dostupná, responzivní a její hlavní konverzní scénáře – výpočet, e-mailový report i PDF průvodce – byly úspěšně ověřeny v produkčním prostředí.

Aplikace je aktuálně provozována v demonstračním režimu. K přechodu na veřejný komerční provoz zbývá vyřešit především tři oblasti, které vyžadují rozhodnutí nebo součinnost zadavatele:

| Oblast | Co je potřeba dořešit a proč |
| --- | --- |
| **Hosting** | Aplikace běží na bezplatném tarifu Vercel Hobby v souladu se zadáním. Tento tarif je určen pro osobní a nekomerční použití, proto je pro reálnou komerční kampaň nutné přejít na odpovídající tarif nebo zvolit jiné vhodné hostingové řešení. |
| **Odesílání e-mailů** | V současnosti mohou e-maily přijímat pouze předem schválené adresy. Omezení je záměrné z důvodu ochrany osobních údajů, bezpečnosti demonstračního provozu a prevence zneužití. Před veřejným spuštěním je nutné zajistit odpovídající právní a provozní podmínky a bezpečné doručování bez omezení na předem schválené příjemce. |
| **Právní a obchodní náležitosti** | Zadavatel musí potvrdit podmínky zpracování osobních údajů, související smluvní a přenosové podmínky poskytovatelů a schválit obsah finanční a reklamní komunikace. Některé otevřené otázky se týkají již současného dema. |

### Proč tyto kroky nejsou součástí dema?

Cílem praktického zadání bylo vytvořit funkční aplikaci na bezplatném hostingu a předvést její reálné fungování.

Proto jsem se zaměřil na dokončení a ověření hlavních funkcí, uživatelského prostředí a konverzních scénářů. Současně jsem ponechal omezení, která brání nekontrolovanému veřejnému využívání demonstrační služby.

Přechod na komerční hosting, schválení právních podmínek a nastavení pravidel veřejného doručování vyžadují součinnost zadavatele.

**Shrnutí:** ETF Kompas je funkční, veřejně dostupná aplikace s ověřenými konverzními scénáři. Po vyřešení uvedených podmínek a závěrečném ověření produkční konfigurace může být využita pro skutečnou reklamní kampaň.

Podrobnosti o současném provozu a otevřených otázkách jsou uvedeny v sekci „Omezení dema a soukromí“ a v dokumentu [technická revize soukromí](docs/privacy-review.md).

## Lokální spuštění a konfigurace

Node.js **24.12+**, npm a Git. Po klonování repozitáře v jeho kořeni:

```powershell
npm ci
npm run dev -- --webpack
```

Otevřete [http://localhost:3000](http://localhost:3000). Kalkulačka funguje i bez konfigurace poskytovatelů; doručování bez úplné konfigurace zůstane bezpečně nedostupné. Webpack je ověřená alternativa k lokálnímu problému Turbopack CSS procesu; výchozí skripty stále používají `next dev` / `next build`.

Pro doručování nastavte v ignorovaném `.env.local` nebo v serverovém prostředí hostingu následující položky. Skutečné klíče ani schválené adresy nevkládejte do repozitáře, veřejné dokumentace nebo logů.

| Proměnná | Účel |
| --- | --- |
| `RESEND_API_KEY` | Tajný serverový klíč Resend |
| `RESEND_FROM_EMAIL` | Odesílatel na ověřené projektové doméně; současný kód vyžaduje `etf.michalwebdeveloper.cz` |
| `TURNSTILE_SECRET_KEY` | Tajný serverový klíč Siteverify |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Veřejný site key widgetu, nikoli tajemství |
| `APP_ORIGIN` | Přesný origin bez cesty, lokálně např. `http://localhost:3000` |
| `DEMO_ALLOWED_EMAILS` | Pouze serverový seznam přesně dvou různých platných testovacích adres oddělených čárkou; žádné wildcardy |
| `PRIVACY_CONTACT_EMAIL` | Samostatný veřejný kontakt na stránce soukromí; není odesílatelem ani tajemstvím |

`localhost` a `127.0.0.1` nejsou pro kontrolu originu zaměnitelné. Turnstile musí povolit používaný hostname; veřejné bypass testovací klíče neaktivují skutečné doručování. Dostupnost formulářů, site key a kontakt se připravují při buildu: po změně konfigurace restartovat dev server nebo vytvořit nový produkční build. Produkční proměnné se nastavují samostatně na hostingu. Žádný Umami API klíč není potřeba.

## Kontroly a jejich hranice

```powershell
npm test
npm run lint
npx tsc --noEmit --incremental false
npm run build -- --webpack
npm run start
```

Poslední ověření aplikačního commitu `bcafdc1` dne 28. 10. 2026: **120/120 testů, ESLint, TypeScript, produkční Webpack build a `git diff --check` prošly**. Test skutečného Umami scriptu tehdy běžel v izolované VM s mockovanou sítí. Při běžném `npm test` se tento jeden test bez dočasného souboru určeného přes `UMAMI_TRACKER_TEST_FILE` přeskočí; návod je v [analytické dokumentaci](docs/analytics.md).

Testy používají fake konfiguraci a mockované služby, nečtou `.env.local` a neposílají skutečné e-maily ani analytické události. Pokrývají model a nezávislý výpočet, validaci, serverový přepočet, allowlist, Turnstile kontrakt, idempotenci, diagnostiku a analytický souhlas/atribuci. Komponentové harnessy nejsou úplným browser E2E testem ani auditem všech e-mailových klientů. Historie obsahuje ruční mobilní a desktopové kontroly; vlastník potvrdil skutečné doručení obou materiálů i produkční odmítnutí nepovolené adresy. Nejde o výsledky kampaně ani o automatizovaný důkaz doručení každého dalšího e-mailu.

V prostředí s místní certifikační autoritou byl Webpack build ověřen s PowerShell nastavením `$env:NODE_OPTIONS='--use-system-ca'`; TLS ověřování zůstává zapnuté. Python není potřeba pro testy, build ani doručování hotového PDF. Jeho volitelná regenerace přes [skript](scripts/build-etf-guide.py) vyžaduje ReportLab, pypdf a dostupné Windows fonty Arial/Georgia; skript není univerzální multiplatformní generátor.

## Práce s AI a lidské ověřování

AI pomáhala s návrhem rozhraní, implementací, výpočty, testy, audity a dokumentací. Úkoly byly zadávány po malých etapách s omezeními: zdroje ETF nevymýšlet, tajemství nezveřejňovat, skutečné e-maily ani publikování nespouštět bez autorizace. Vlastník schvaloval návrhy a vizuální výsledek, ověřoval doručené materiály a rozhodoval o provozních omezeních; technické výstupy se kontrolovaly diffem, testy, buildem a lokálním prohlížečem.

Doložené chyby a rozhodnutí zahrnují:

- Inicializace druhého Turnstile widgetu: opraven společný loader a nezávislé instance, doplněny regrese.
- Obnovení odvolaného analytického souhlasu při selhání storage: zvoleno konzervativní povolení jen v paměti dokumentu, testy odvolání a více karet.
- Obsahová idempotence nerozlišovala novou žádost o stejný materiál: nahrazena UUID jedné logické žádosti, zachováním identity při nejistém výsledku a bezpečnou diagnostikou. Původní produkční HTTP 503 tím nebyla definitivně vysvětlena.
- První validační HTTP 400 zamykala opravu údajů; timeout při čtení těla odpovědi byl chybně klasifikován. Obojí opraveno a pokryto regresními testy.

Podklady, rozhodnutí, příkazy a hranice ověření jsou v [ai-log/](ai-log/README.md). Redigovaný autentický přepis 302 položek je již dostupný v [ai-log/exports/](ai-log/exports/README.md), včetně indexu zpráv a kontroly úplnosti. Pracovní souhrny jsou vedeny odděleně od autentického přepisu.

## Omezení dema a soukromí

Server kontroluje schváleného příjemce u obou endpointů před přípravou materiálu a voláním Resendu. Chybějící nebo neplatná konfigurace doručování blokuje. Zůstávají validace, honeypot, kontrola originu a velikosti, serverové Turnstile a idempotence. **Distribuovaný limit podle IP/adresy není implementován**; ochrany a kvóty poskytovatele nejsou jeho ekvivalentem. Retry po nejistém výsledku drží původní UUID, adresu a scénář jen v paměti formuláře; reload nebo jiná karta tuto identitu ztratí. Automatické retry není implementované.

Aplikace nevytváří databázi kontaktů získaných z formulářů ani marketingový odběr. Osobní údaje přesto zpracovává aplikace, hosting, Turnstile, při schválené žádosti Resend a po souhlasu Umami. Resend deklaruje primární zpracování v USA; EU region Umami nezaručuje výhradně evropské zpracování všech provozních údajů.

Otevřené právní základy některých činností, retence a smluvní/přenosové podmínky poskytovatelů, včetně použitelného ujednání pro Vercel Hobby, se týkají také **současného dema**. Omezení příjemců ani zveřejnění nedostatků je právně neřeší. Před skutečnou reklamou nebo veřejným získáváním kontaktů je nutné tyto otázky uzavřít a znovu posoudit rozšířený provoz. Podrobnosti: [veřejná stránka soukromí](https://etf-kompas-zeta.vercel.app/ochrana-osobnich-udaju) a [technická revize](docs/privacy-review.md).

## Orientace v projektu

- `src/app/`, `src/components/`: stránky, kalkulačka, formuláře, analytika a Turnstile.
- `src/data/etfs.ts`, `src/lib/investment.ts`: datový katalog a čistý model.
- `src/lib/email/`, `src/app/api/materials/`: validace, obsah a serverové doručování.
- `tests/`: automatické testy; `output/pdf/`: verzovaná příloha; `scripts/`: její generátor.
- [Data a metodika](docs/etf-data-and-model.md) · [Doručování a bezpečnost](docs/email-delivery.md) · [Analytika](docs/analytics.md) · [Reklamy a konverze](docs/ads-and-conversions.md) · [Revize soukromí](docs/privacy-review.md).
