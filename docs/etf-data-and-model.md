# ETF Kompas: data a výpočetní model

## Ověřený datový přehled

Ruční ověření: **26. 10. 2026**, Europe/Prague. Nejde o živý datový feed. Údaje jsou v `src/data/etfs.ts`; nákladovost je uložena v procentech, tedy `0.03` znamená **0,03 % ročně**. Všechny čtyři fondy nyní sledují S&P 500 Index a jsou kotovány na NYSE Arca. Datum ověření není datum zavedení poplatku.

| Ticker | Úplný název | Roční nákladovost | Primární zdroj | Datum podkladu |
| --- | --- | --- | --- | --- |
| SPY | State Street® SPDR® S&P 500® ETF Trust | 0,0945 % (Gross Expense Ratio) | [State Street](https://www.ssga.com/us/en/individual/etfs/state-street-spdr-sp-500-etf-trust-spy) | Fund Information 26. 10. 2026 |
| SPYM | State Street® SPDR® Portfolio S&P 500® ETF | 0,02 % (Gross Expense Ratio) | [State Street](https://www.ssga.com/us/en/individual/etfs/state-street-spdr-portfolio-sp-500-etf-spym) | Fund Information 26. 10. 2026 |
| VOO | Vanguard S&P 500 ETF | 0,03 % (Expense ratio) | [Vanguard factsheet](https://workplace.vanguard.com/assets/corp/fund_communications/pdf_publish/us-products/fact-sheet/F0968.pdf) | 30. 9. 2026 |
| IVV | iShares Core S&P 500 ETF | 0,03 % (Expense Ratio) | [iShares](https://www.ishares.com/us/products/239726/ishares-core-sp-500-etf-ivv) | aktuální prospekt; přesné datum sazby na produktové stránce neuvedeno |

Správa je v datech uvedena včetně role: u SPY State Street Global Advisors Trust Company jako **trustee**, u SPYM SSGA Funds Management, Inc. jako Investment Manager. Nejde o stejnou právní strukturu. U VOO uvádí sekce Management [produktové stránky Vanguard](https://advisors.vanguard.com/investments/products/voo/vanguard-sp-500-etf?fromSearch=true&source=autosuggest) Vanguard Capital Management; samotný factsheet správce neuvádí. U IVV je investičním poradcem BlackRock Fund Advisors podle [prospektu BlackRock](https://www.blackrock.com/us/individual/literature/prospectus/p-ishares-trust-us-sp-cap-non-sector-3-31.pdf) z 31. 7. 2026. Značka emitenta je uložena odděleně.

SPYM byl dříve SPLG. Oficiální [oznámení State Street z 22. 10. 2025](https://www.ssga.com/library-content/products/fund-docs/etfs/us/information-schedules/ap-notice/notice-to-aps-ticker-fund-name-and-benchmark-index-name-changes-10-31-25.pdf) uvádí účinnost změny 31. 10. 2025. Obsah oznámení byl dostupný v indexovaném výstupu vyhledávání na doméně emitenta, přímé otevření PDF však při kontrole vracelo 404. Aktuální ticker potvrzuje živá produktová stránka SPYM. Historický odkaz může vyžadovat dohledání nového umístění.

`sourceAsOf: null` u IVV znamená neznámé přesné datum platnosti nákladovosti; datum ověření je známé. Pokud při další aktualizaci nepůjde sazba ověřit, použít `verificationStatus: "unverified"` a `annualExpenseRatioPercent: null`; nepoužívat nulu ani neověřenou sazbu ve výpočtu. Automatické testy neověřují aktuálnost webu. Před publikováním údaje znovu ručně ověřit.

## Model pravidelného investování

`modelInvestment` je čistá synchronní TypeScript funkce bez Reactu, I/O nebo závislosti na ETF katalogu. Začíná nulovým zůstatkem. Každý měsíc nejprve proběhne modelový růst a pak vklad **na konci měsíce**. Všechny částky jsou ve stejné uživatelem zvolené peněžní jednotce; funkce neprovádí konverze měn.

Pro měsíční vklad `P`, roky `Y`, hrubý roční výnos `G` v procentech a roční nákladovost `F` v procentech:

```text
g = G / 100; f = F / 100
q = ((1 + g) * (1 - f))^(1/12)
V[0] = 0
V[m] = V[m-1] * q + P, m = 1 ... 12Y
součet vkladů = P * 12Y
```

Implementace používá ekvivalentní `exp((log1p(g) + log1p(-f)) / 12)` pro měsíční faktor. Poplatek modelujeme jako poměrnou redukci růstového faktoru; není to prosté odečtení procentních bodů `g - f`. Jde o zjednodušení průběžného promítání nákladů do NAV, nikoli přesnou simulaci účetnictví fondu či fakturovaného poplatku. Nevycházíme z historických čistých výnosů ETF, aby nedošlo k dvojímu započtení nákladů.

Výstup obsahuje `totalContributions`, `finalValue` a `annualProgress` s bodem v roce 0 a následně na konci každého roku. Roční bod má `year`, `totalContributions`, `value`. Částky se uvnitř nezaokrouhlují; používá se IEEE 754 `number`. Zaokrouhlení pro zobrazení patří až do budoucího UI, model není účetní evidence s přesností na haléře.

`compareInvestments(sharedInputs, [feeA, feeB])` přijímá **jeden společný hrubý výnos**, vklad a horizont. Vrací `first`, `second` a `finalValueDifference = second.finalValue - first.finalValue`. Rozdíl izoluje pouze modelovaný vliv nákladovosti včetně složeného růstu; není součtem skutečně stržených poplatků ani predikcí rozdílu výkonnosti konkrétních fondů.

### Validace a omezení

- Pouze konečná čísla, bez automatického převodu řetězců. Chyby: `RangeError`.
- Měsíční vklad 0 až 1 000 000 000; celé roky 0 až 100. Nulový horizont vrací pouze počáteční bod.
- Hrubý roční výnos větší než −100 % a nejvýše 100 %; nákladovost od 0 % do méně než 100 %. Záporný výnos je podporován. Limity jsou ochranou aplikace, nikoli odhadem možného tržního vývoje.
- Výsledek nad `Number.MAX_SAFE_INTEGER` nebo nekonečný výsledek se odmítne pomocí `RangeError`; maximálně 1 200 měsíčních iterací.
- Konstantní výnos a sazba po celý horizont, žádná volatilita, sled skutečných tržních výnosů, odchylka sledování, změny nákladovosti ani rozdílná správa hotovosti. Předpoklad úplného reinvestování výnosů, možnosti zlomkových podílů a nulové počáteční investice.
- **Výnos není zaručen a může dojít ke ztrátě.** Model automaticky nezahrnuje daně, inflaci, kurzové změny, provize brokera, spread ani další transakční náklady. Nejde o investiční doporučení.

## Dostupnost pro český retail: PRIIPs/KID

Český drobný investor nemá automaticky možnost koupit tyto americké ETF jen proto, že jsou kotovány na NYSE Arca. Pravidla PRIIPs vyžadují poskytnutí dokumentu KID pro retailovou distribuci; americké ETF jej často nevydávají, a nákup proto bývá u evropských brokerů blokován. Americký factsheet nebo prospekt sám o sobě KID nenahrazuje. Nejde o plošný zákaz vlastnit americké ETF; konkrétní dostupnost závisí na dokumentaci, brokerovi a klasifikaci klienta. U těchto čtyř fondů zde není provedena individuální kontrola obchodních oprávnění ani dostupnosti KID u každého brokera.

Ověřitelné zdroje (kontrola 26. 10. 2026): [Evropská komise — PRIIPs/KID](https://finance.ec.europa.eu/consumer-finance-and-payments/retail-financial-services/key-information-documents-packaged-retail-and-insurance-based-investment-products-priips_en), [ESMA / společné Q&A, část I](https://www.esma.europa.eu/sites/default/files/2023-05/JC_2023_22_-_Consolidated_JC_PRIIPs_Q_As.pdf), [LYNX — KID a omezení nákupů amerických ETF pro retail](https://www.lynxbroker.com/service/products-and-regulations/regulations/key-information-document/). Před konkrétní transakcí ověřit aktuální podmínky brokera; tento datový přehled dostupnost neslibuje.

## Spuštění kontrol

```sh
npm test
npm run lint
npm run build
```

Testy používají vestavěný `node:test` a `node:assert/strict`, bez nové závislosti. Ověřené prostředí: Node.js 24.22.0 (pro přímé spouštění TypeScriptu použít Node.js 24.12 nebo novější). `allowImportingTsExtensions` umožňuje typově kontrolovat explicitní `.ts` importy v testech; existující `noEmit` zůstává zapnuté. Node sám typy nekontroluje, kontrolu TypeScriptu provádí produkční build. [Dokumentace Node.js](https://nodejs.org/api/typescript.html).

Testy zahrnují nulové výnosy a poplatky, stejné fondy, nulový vklad/horizont, horizonty 1/5/30/100 let, záporný výnos, průběh každého roku, jednotky procent, neplatné vstupy, limity a nezávislý uzavřený výpočet geometrické řady včetně známého měsíčního růstu 1 %.
