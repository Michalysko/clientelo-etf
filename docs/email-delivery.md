# Jednorázové materiály přes Resend

## Rozhraní

Pouze `POST /api/materials/report` a `POST /api/materials/guide`, JSON do **8 192 skutečných bytů**. Kontroluje se deklarovaný Content-Length i počet bytů při čtení streamu. MIME musí být `application/json`. Odpovědi nejsou cachované.

Společná pole: `email`, `website` (prázdný honeypot), `turnstileToken`. Report navíc vyžaduje `scenario` s poli `firstTicker`, `secondTicker`, `monthlyContribution`, `years`, `grossAnnualReturnPercent`, `initialInvestment: 0`. Povolené jsou pouze známé tickery s ověřenou nákladovostí z katalogu. Neznámá pole, klientské výsledky, vlastní sazby, číselné řetězce a neplatné mezní hodnoty se odmítnou. Neprovádí se změna existující investiční metodiky; počáteční investice je stále pevně 0 Kč.

Server validuje scénář a znovu volá `compareInvestments`. E-mail obsahuje počáteční investici, měsíční vklad, horizont, společný hrubý výnos, nákladovost, celkové vklady, hodnoty obou fondů, absolutní rozdíl s kontextem a tabulku roků 0 až Y. Přidává metodiku, omezení a primární i doplňující zdroje s daty ověření. Částky jsou zaokrouhlené jen pro zobrazení. HTML je responzivní tabulkový e-mail s vloženými styly; souběžně se posílá textová alternativa. Report se negeneruje jako PDF.

Průvodce je statické sedmistránkové PDF v `output/pdf/etf-od-nuly.pdf`, mimo veřejné routy. Route Handler načte soubor z pevné cesty a připojí jej base64 jako `application/pdf`. Limit aplikace je 2 MiB; aktuální soubor má přibližně 127 kB. Ověří se PDF hlavička i velikost. `outputFileTracingIncludes` v Next konfiguraci zajišťuje přibalení souboru do serverové funkce. PDF není digitální tajemství: budoucí zveřejnění zdrojového repozitáře by zpřístupnilo jeho soubor. Web aplikace však nenabízí anonymní veřejnou URL ke stažení a příloha se uvolní až po zadaném e-mailu a validaci ochrany.

Odpovědi: `202` pouze po úspěšném potvrzení Resendem obsahujícím ID; `400` neplatné vstupy; `403` origin/Turnstile; `405` jiná metoda; `413` velikost; `415` MIME; `429` omezení u poskytovatele; `503` chybějící konfigurace nebo nepotvrzené odeslání. Klient dostává pouze obecné zprávy, žádné interní výjimky, ID klíčů nebo odpovědi poskytovatele. API nepřijímá URL příloh, předmět, HTML ani adresu odesílatele z klienta.

## Schválená ochrana bez databáze

Uživatel zvolil **Turnstile + honeypot + Resend idempotence, bez distribuovaného limitu podle IP**. Nejde o per-IP/per-email rate limiter a není zde žádné tvrzení o spolehlivém limitu z paměti procesu.

- Origin požadavku i URL musí odpovídat `APP_ORIGIN`; cross-site požadavky se odmítnou. Nejde o náhradu autentizace: bot si může Origin podvrhnout, proto je současně povinný Turnstile.
- Turnstile je vždy ověřen serverem. Nestačí klientský widget. Musí souhlasit `success`, přesný hostname a action `report`/`guide`. Token je u poskytovatele jednorázový a platí pět minut. Chyba/verifikace mimo provoz znamená odmítnutí, nikoli obejití ochrany.
- Klient po pokusu resetuje widget a vyžádá nový token. Honeypot je mimo běžné ovládání klávesnicí a asistivními technologiemi; vyplněný požadavek se odmítne, bez falešného hlášení o úspěchu.
- Resend idempotency key je HMAC-SHA256 celého deterministického payloadu včetně příjemce, obsahu a případné přílohy. Jako serverové HMAC tajemství se používá existující Resend klíč, jeho hodnota se do hlavičky nepřenáší. Stejný payload při retry používá stejný klíč. Resend uchovává idempotenci 24 hodin; rotace klíče nebo změna obsahu vytvoří nový klíč. Nejde o omezení požadavků s odlišným příjemcem/scénářem.
- Není zde databáze, kontaktový seznam, cron, newsletter ani ETF Hlídač. Aplikace neshromažďuje IP adresy pro limiter. Její kód neloguje e-maily, request body ani poskytovatelské chyby. Resend musí příjemce a obsah zpracovat pro doručení; infrastruktura i poskytovatelé mohou mít vlastní provozní logy a retenční pravidla.

Omezení je vědomé: Turnstile snižuje automatizované zneužívání, ale neposkytuje tvrdý rozpočet odesílání. Kvóty a omezení Resendu zůstávají relevantní. Pro větší veřejný provoz by bylo vhodné samostatně schválit další ochranu/limity. Výpadek ochrany nesmí otevřít nechráněný fallback.

## Konfigurace a provoz

Názvy všech pěti proměnných jsou v README. Nikdy nepoužívat `NEXT_PUBLIC_RESEND_API_KEY`. Pouze Turnstile site key je veřejný. Konfigurace se načítá ze serverového prostředí, do stránky se předává jen booleovský stav a veřejný site key. Chybějící konfigurace ukáže dočasnou nedostupnost a zablokuje tlačítka; route vrátí 503. Aktuální bezpečnostní kontrola odesílatele očekává přesně doménu `etf.michalwebdeveloper.cz` podle ověřené domény dodané uživatelem.

Lokální `APP_ORIGIN` musí odpovídat URL otevřené v prohlížeči; `localhost` a `127.0.0.1` nejsou zaměnitelné. Na produkci použít vlastní HTTPS origin. Při provozu přes proxy musí její konfigurace zachovat správnou URL/origin. Po úpravě prostředí je nutný nový build/restart; dostupnost v prerenderované stránce a veřejný site key nejsou živá konfigurační služba.

Ochranné timeouty: Siteverify 8 s, Resend 12 s, klient 30 s; Route Handlers deklarují maxDuration 30 s pro podporující hosting. Žádný automatický retry Resendu. Při nejistém výsledku UI nenahlásí úspěch a případné opakování stejného obsahu chrání idempotence. Úspěch znamená přijetí službou, nikoli doručení do schránky; bounce může nastat později a webhooky nejsou implementované.

Zadání e-mailu slouží k jednorázovému vyžádanému materiálu. Neobsahuje souhlas s marketingem a automaticky nevytváří kontakt pro jiné nabídky. Stránka popisuje předání údajů Resendu a použití Turnstile. Před veřejným ostrým provozem musí vlastník doplnit úplné informace o správci, kontaktu, retenčních pravidlech a právech podle své skutečné provozní situace; aplikace tyto chybějící údaje nevymýšlí.

## Testy a co znamenají

`npm test` používá `node:test` bez nové závislosti. Nové testy injektují fake konfiguraci a mockované `fetch`/send funkce. Nečtou `.env.local`, nikdy nepoužívají skutečné klíče ani neodesílají zprávy. Pokrývají validaci, nezávislost na klientských výsledcích, vazbu na model, obsah HTML/textu, roční přehled, PDF přílohu, limit streamu, origin, honeypot, ověření tokenu, bezpečné chyby a chování idempotence.

Neověřují reálný účet Resend, skutečné doručení, Gmail/Outlook rendering ve všech klientech ani skutečnou Turnstile konfiguraci. Vlastník následně potvrdil doručení obou materiálů i kontrolu jejich obsahu; jde o jeho ruční ověření, nikoli výsledek automatických testů. Závěrečný audit 26. 10. 2026 žádné další e-maily neodesílal. Každý další reálný test vyžaduje samostatnou autorizaci. Nikdy nepouštět skutečný POST za účelem integračního testu jen proto, že jsou v prostředí dostupné klíče.

## Před veřejným spuštěním — doplní vlastník

Současné texty nejsou úplným informačním dokumentem pro veřejný sběr údajů. Na stránce je tato mezera výslovně označena. Nejde o překážku uložení kódu do Gitu, ale je to podmínka před veřejným provozem.

- Skutečná identita a kontakt správce, případně kontakt pověřence, pokud existuje.
- Účely a odpovídající právní základy jednorázového zaslání a bezpečnostního ověřování; případné oprávněné zájmy. Právní základ musí vlastník určit podle skutečného provozu, aplikace jej nevymýšlí.
- Konkrétní doby uchovávání nebo kritéria, včetně obsahu zpráv a provozních záznamů u poskytovatelů. Absence vlastní databáze neznamená, že Resend příjemce ani obsah neuchovává.
- Příjemci/zpracovatelé (Resend, Cloudflare a budoucí hosting), skutečné přenosy mimo EHP a použité záruky; prověřit smluvní podmínky a zpracovatelská ujednání.
- Použitelná práva, způsob a kontakt pro jejich uplatnění, možnost stížnosti u dozorového úřadu, případné odvolání souhlasu, pokud se na něj některé zpracování opírá.
- Dobrovolnost poskytnutí e-mailu a důsledek neposkytnutí (materiál nelze zaslat); případné další informace podle skutečného zpracování. Jednorázové vyžádání nikdy neaktivuje newsletter ani ETF Hlídače.

Podklad seznamu: [EDPB — informační povinnost a práva jednotlivců](https://www.edpb.europa.eu/sme/be-compliant/respect-individuals-rights_en). Údaje musí být dostupné při sběru, nikoli až dodatečně po odeslání.

Po deploymentu také nastavit správný APP_ORIGIN a Turnstile hostname, ověřit provozní limity poskytovatelů a rozhodnout, zda schválená ochrana bez distribuovaného limiteru odpovídá očekávanému provozu. Statické PDF má slovní výzvu k návratu a zřetelné upozornění na budoucí doplnění veřejného odkazu; skutečnou URL je nutné doplnit ve zdrojovém skriptu a PDF regenerovat. Neodvozovat ji z lokálního originu.

Závěrečné automatické kontroly: 53 testů, ESLint a produkční Webpack build prošly. Přidána kontrola neplatných adres před fetch, přístupné chybové hlášení, souběžného dvojkliku a odpovědí 400/403/429/500/503 i chyby sítě u obou formulářů. Report u hlavního čísla výslovně rozlišuje rozdíl konečných hodnot a skutečně zaplacené poplatky, v HTML i textové alternativě. Výpočetní model se nezměnil.

Turbopack lokálně reprodukuje předčasné ukončení CSS pomocného procesu před IPC spojením; stejný symptom je [hlášen v repozitáři Next.js](https://github.com/vercel/next.js/discussions/94693). Hlášení dokládá shodný symptom, nikoli konkrétní příčinu na tomto počítači. Bez riskantní aktualizace použito `npm run build -- --webpack`; výchozí příkaz zůstává beze změny.

## Primární technické zdroje

Kontrolováno 26. 10. 2026:

- [Resend Send Email](https://resend.com/docs/api-reference/emails/send-email)
- [Resend idempotence](https://resend.com/docs/dashboard/emails/idempotency-keys)
- [Turnstile serverové ověření](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)
- [Turnstile explicitní widget](https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/)
- [Turnstile testování](https://developers.cloudflare.com/turnstile/troubleshooting/testing/)
- Soukromí: [Resend](https://resend.com/legal/privacy-policy), [Cloudflare](https://www.cloudflare.com/privacypolicy/)

PDF obsahuje klikatelné vzdělávací zdroje SEC/Investor.gov, S&P DJI, Vanguard, iShares, Evropské komise, LYNX, ESMA a State Street. Jeho zdroj je `scripts/build-etf-guide.py`; čísla modelového příkladu se při generování načítají přímo z katalogu a `compareInvestments`.
