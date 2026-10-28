# Jednorázové materiály přes Resend

## Aktuální demonstrační provoz — 28. 10. 2026

Aplikace je nasazená na [Vercel Hobby](https://etf-kompas-zeta.vercel.app/). Kalkulačka je veřejná, doručování obou materiálů omezuje společný serverový allowlist `DEMO_ALLOWED_EMAILS`: přesně dvě různé platné adresy, oddělené čárkou, bez wildcardů. Jejich skutečné hodnoty se nezveřejňují. Chybějící či neplatná konfigurace zablokuje doručování. Po validaci a Siteverify handler ověří příjemce ještě před přípravou materiálu, čtením PDF a voláním Resendu. Nepovolená adresa vrátí `403` s veřejným kódem `demo_not_allowed`, bez předání Resendu a bez logování adresy.

Vlastník potvrdil po nasazení demonstračního režimu skutečné doručení HTML reportu i PDF schválenému příjemci a odmítnutí nepovolené adresy. Jde o jeho ruční ověření, nikoli nový automatický test všech produkčních scénářů. Právní a smluvní otázky současného dema zůstávají otevřené, viz [revize soukromí](privacy-review.md). Historické výsledky jednotlivých etap níže nejsou aktuálním součtem testů.

## Rozhraní

Pouze `POST /api/materials/report` a `POST /api/materials/guide`, JSON do **8 192 skutečných bytů**. Kontroluje se deklarovaný Content-Length i počet bytů při čtení streamu. MIME musí být `application/json`. Odpovědi nejsou cachované.

Společná pole: `requestId` (malými písmeny zapsané UUID v4), `email`, `website` (prázdný honeypot), `turnstileToken`. Report navíc vyžaduje `scenario` s poli `firstTicker`, `secondTicker`, `monthlyContribution`, `years`, `grossAnnualReturnPercent`, `initialInvestment: 0`. Povolené jsou pouze známé tickery s ověřenou nákladovostí z katalogu. Neznámá pole, klientské výsledky, vlastní sazby, číselné řetězce a neplatné mezní hodnoty se odmítnou. Neprovádí se změna existující investiční metodiky; počáteční investice je stále pevně 0 Kč.

Server validuje scénář a znovu volá `compareInvestments`. E-mail obsahuje počáteční investici, měsíční vklad, horizont, společný hrubý výnos, nákladovost, celkové vklady, hodnoty obou fondů, absolutní rozdíl s kontextem a tabulku roků 0 až Y. Přidává metodiku, omezení a primární i doplňující zdroje s daty ověření. Částky jsou zaokrouhlené jen pro zobrazení. HTML je responzivní tabulkový e-mail s vloženými styly; souběžně se posílá textová alternativa. Report se negeneruje jako PDF.

Průvodce je statické sedmistránkové PDF v `output/pdf/etf-od-nuly.pdf`, mimo veřejné routy. Route Handler načte soubor z pevné cesty a připojí jej base64 jako `application/pdf`. Limit aplikace je 2 MiB; aktuální verzovaný soubor má 128 205 bajtů. Ověří se PDF hlavička i velikost. `outputFileTracingIncludes` v Next konfiguraci zajišťuje přibalení souboru do serverové funkce. PDF není digitální tajemství: budoucí zveřejnění zdrojového repozitáře by zpřístupnilo jeho soubor. Web aplikace však nenabízí anonymní veřejnou URL ke stažení a příloha se uvolní až po zadaném e-mailu, validaci ochrany a schválení příjemce.

Odpovědi: `202` pouze po úspěšném potvrzení Resendem obsahujícím ID; `400` neplatné vstupy; `403` origin/Turnstile nebo nepovolený testovací příjemce; `405` jiná metoda; `413` velikost; `415` MIME; `429` omezení u poskytovatele; `503` chybějící konfigurace nebo nepotvrzené odeslání. Klient dostává pouze obecné zprávy, žádné interní výjimky, ID klíčů nebo odpovědi poskytovatele. API nepřijímá URL příloh, předmět, HTML ani adresu odesílatele z klienta.

## Schválená ochrana bez databáze

Uživatel zvolil **Turnstile + honeypot + Resend idempotence, bez distribuovaného limitu podle IP**. Nejde o per-IP/per-email rate limiter a není zde žádné tvrzení o spolehlivém limitu z paměti procesu.

- Origin požadavku i URL musí odpovídat `APP_ORIGIN`; cross-site požadavky se odmítnou. Nejde o náhradu autentizace: bot si může Origin podvrhnout, proto je současně povinný Turnstile.
- Turnstile je vždy ověřen serverem. Nestačí klientský widget. Musí souhlasit `success`, přesný hostname a action `report`/`guide`. Token je u poskytovatele jednorázový a platí pět minut. Chyba/verifikace mimo provoz znamená odmítnutí, nikoli obejití ochrany.
- Klient po pokusu resetuje widget a vyžádá nový token. Honeypot je mimo běžné ovládání klávesnicí a asistivními technologiemi; vyplněný požadavek se odmítne, bez falešného hlášení o úspěchu.
- Resend idempotency key v2 je oddělený pro report/guide a je HMAC-SHA256 náhodného UUID jedné logické žádosti. Tajemstvím zůstává serverový Resend klíč. ID ani klíč nejsou analytické údaje. Příjemce a celý obsah kontroluje Resend: opakování stejného klíče s jiným payloadem vrátí konflikt, nikoli další e-mail. Dvě vědomé žádosti mají různá UUID, i když obsahují stejný materiál a příjemce. Resend deduplikuje po dobu 24 hodin; rotace serverového API klíče změní HMAC, proto během nevyřešených žádostí nerotovat klíč bez posouzení rizika duplicit.
- Není zde databáze kontaktů získaných z formulářů, cron, newsletter ani ETF Hlídač. Neveřejný seznam testovacích příjemců je pouze v serverové konfiguraci. Aplikace neshromažďuje IP adresy pro limiter. Její kód neloguje e-maily, request body, tokeny, ID žádostí ani surové poskytovatelské chyby. Loguje pouze allowlist diagnostických kategorií. Resend musí příjemce a obsah zpracovat pro doručení; infrastruktura i poskytovatelé mohou mít vlastní provozní logy a retenční pravidla.

Omezení je vědomé: Turnstile snižuje automatizované zneužívání, ale neposkytuje tvrdý rozpočet odesílání. Kvóty a omezení Resendu zůstávají relevantní. Pro větší veřejný provoz by bylo vhodné samostatně schválit další ochranu/limity. Výpadek ochrany nesmí otevřít nechráněný fallback.

## Konfigurace a provoz

Doručování vyžaduje `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `TURNSTILE_SECRET_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `APP_ORIGIN` a `DEMO_ALLOWED_EMAILS`. Samostatný `PRIVACY_CONTACT_EMAIL` určuje veřejný kontakt, nikoli příjemce nebo odesílatele. Popis je v [README](../README.md). Nikdy nepoužívat `NEXT_PUBLIC_RESEND_API_KEY`. Pouze Turnstile site key je veřejný. Konfigurace se načítá ze serverového prostředí, do stránky se předává jen booleovský stav a veřejný site key. Chybějící konfigurace ukáže dočasnou nedostupnost a zablokuje tlačítka; route vrátí 503. Aktuální bezpečnostní kontrola odesílatele očekává přesně doménu `etf.michalwebdeveloper.cz` podle ověřené domény dodané uživatelem.

Lokální `APP_ORIGIN` musí odpovídat URL otevřené v prohlížeči; `localhost` a `127.0.0.1` nejsou zaměnitelné. Na produkci použít vlastní HTTPS origin. Při provozu přes proxy musí její konfigurace zachovat správnou URL/origin. Po úpravě prostředí je nutný nový build/restart; dostupnost v prerenderované stránce a veřejný site key nejsou živá konfigurační služba.

Ochranné timeouty: Siteverify 8 s, Resend 12 s, klient 30 s; Route Handlers deklarují maxDuration 30 s pro podporující hosting. Žádný automatický retry Resendu. Při nejistém výsledku UI nenahlásí úspěch a případné opakování stejné logické žádosti chrání idempotence. Úspěch znamená přijetí službou, nikoli doručení do schránky; bounce může nastat později a webhooky nejsou implementované.

Zadání e-mailu slouží k jednorázovému vyžádanému materiálu. Neobsahuje souhlas s marketingem a automaticky nevytváří kontakt pro jiné nabídky. Stránka popisuje předání údajů Resendu a použití Turnstile. Správce a veřejný kontakt jsou uvedeny na stránce soukromí; právní základy některých činností, retence a smluvní/přenosové podmínky současného dema dosud nejsou uzavřené. Jejich zveřejnění ani allowlist nedostatky právně neřeší.

## Testy a co znamenají

`npm test` používá `node:test` bez nové závislosti. Nové testy injektují fake konfiguraci a mockované `fetch`/send funkce. Nečtou `.env.local`, nikdy nepoužívají skutečné klíče ani neodesílají zprávy. Pokrývají validaci, nezávislost na klientských výsledcích, vazbu na model, obsah HTML/textu, roční přehled, PDF přílohu, limit streamu, origin, honeypot, ověření tokenu, bezpečné chyby a chování idempotence.

Neověřují reálný účet Resend, skutečné doručení, Gmail/Outlook rendering ve všech klientech ani skutečnou Turnstile konfiguraci. Vlastník následně potvrdil doručení obou materiálů i kontrolu jejich obsahu; jde o jeho ruční ověření, nikoli výsledek automatických testů. Závěrečný audit 26. 10. 2026 žádné další e-maily neodesílal. Každý další reálný test vyžaduje samostatnou autorizaci. Nikdy nepouštět skutečný POST za účelem integračního testu jen proto, že jsou v prostředí dostupné klíče.

## Otevřené podmínky současného dema a případného rozšíření

Aktualizace 27. 10. 2026: informace jsou nyní na `/ochrana-osobnich-udaju`, na kterou vedou odkazy z obou formulářů. Vlastník poskytl jméno správce Michal Růžička; veřejný kontakt `privacy@michalwebdeveloper.cz` se nastavuje samostatně přes `PRIVACY_CONTACT_EMAIL` a vlastník potvrdil jeho obousměrné otestování. Lokální nastavení bylo doplněno bez změny doručovacích proměnných. Přesný stav a zbývající podklady jsou v [revizi soukromí](privacy-review.md). Tato úprava nemění endpointy, výpočty, payloady ani odesílání.

Veřejná stránka nyní rozlišuje skutečný demonstrační provoz od neuzavřených právních a provozních podmínek. Následující seznam vznikl při původní revizi; identita a kontakt jsou doplněné, ostatní body je třeba posuzovat podle aktuální revize soukromí také pro současné demo, nikoli jen pro budoucí veřejný sběr.

- Identita a veřejný kontakt správce jsou doplněné; zajistit skutečný postup vyřizování žádostí.
- Účely a odpovídající právní základy jednorázového zaslání a bezpečnostního ověřování; případné oprávněné zájmy. Právní základ musí vlastník určit podle skutečného provozu, aplikace jej nevymýšlí.
- Konkrétní doby uchovávání nebo kritéria, včetně obsahu zpráv a provozních záznamů u poskytovatelů. Absence vlastní databáze neznamená, že Resend příjemce ani obsah neuchovává.
- Příjemci/zpracovatelé (Resend, Cloudflare, Vercel a při souhlasu Umami), skutečné přenosy mimo EHP a použité záruky; prověřit smluvní podmínky a zpracovatelská ujednání.
- Použitelná práva, způsob a kontakt pro jejich uplatnění, možnost stížnosti u dozorového úřadu, případné odvolání souhlasu, pokud se na něj některé zpracování opírá.
- Dobrovolnost poskytnutí e-mailu a důsledek neposkytnutí (materiál nelze zaslat); případné další informace podle skutečného zpracování. Jednorázové vyžádání nikdy neaktivuje newsletter ani ETF Hlídače.

Podklad seznamu: [EDPB — informační povinnost a práva jednotlivců](https://www.edpb.europa.eu/sme/be-compliant/respect-individuals-rights_en). Údaje musí být dostupné při sběru, nikoli až dodatečně po odeslání.

Produkční APP_ORIGIN a Turnstile hostname byly nastaveny podle potvrzení vlastníka. Při případné změně domény je ověřit znovu, stejně jako provozní limity. PDF má na sedmé straně kliknutelný odkaz na existující kotvu https://etf-kompas-zeta.vercel.app/#kalkulacka. Aktualizované PDF je verzované a zahrnuté do produkčního balíčku endpointu; běžný build je negeneruje. Při změně odkazu upravit skript, PDF znovu vytvořit a zkontrolovat sedm stran i sazbu.

Historické automatické kontroly etapy 26. 10. 2026: 53 testů, ESLint a produkční Webpack build prošly. Přidána kontrola neplatných adres před fetch, přístupné chybové hlášení, souběžného dvojkliku a odpovědí 400/403/429/500/503 i chyby sítě u obou formulářů. Report u hlavního čísla výslovně rozlišuje rozdíl konečných hodnot a skutečně zaplacené poplatky, v HTML i textové alternativě. Výpočetní model se nezměnil.

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


## Životní cyklus žádosti — oprava 28. 10. 2026

Dosavadní obsahový klíč neodlišoval nový vědomý požadavek od retry. To mohlo během 24 hodin vracet původní ID průvodce bez nového e-mailu. Je to vysvětlení deduplikace, nikoli prokázaná příčina produkční 503.

Nové vědomé odeslání vytvoří přes window.crypto.randomUUID() jednu identitu a snímek příjemce/scénáře. Při nejistém výsledku je adresa uzamčena, tlačítko zní „Zopakovat stejnou žádost“ a opakování zachová UUID i původní scénář. Změny kalkulačky původní žádost nepřepisují. Není přidáno automatické retry. Každý pokus musí získat nový Turnstile token a projít původními serverovými kontrolami. 202 + accepted uzavře žádost a další vědomé odeslání vytvoří nové UUID. Vlastní validační odmítnutí bez historie nejistého výsledku je samostatná výjimka: dovolí opravu údajů před novou žádostí, viz cílené P2 opravy níže. Ani přijetí Resendem, včetně opakované původní odpovědi, nepotvrzuje doručení nebo nový unikátní e-mail. Umami měří nadále potvrzené pokusy, ne unikátní zprávy.

Stav se drží jen v paměti formuláře, nikoli v databázi nebo browser storage. Reload, odmountování, zavření nebo jiná karta jej ztratí; po nejistém výsledku UI výslovně varuje před takovým postupem. Bez sdílené trvalé evidence nelze garantovat deduplikaci mezi samostatnými kartami a po reloadu. Klient blokuje retry po 23 hodinách od založení jako rezervu vůči 24hodinové retenci Resendu; ochrana před ruční změnou hodin nebo úmyslným obcházením klienta tím nevzniká. Po této době nejprve ověřit původní zprávu. Po deploymentu, který mění obsah zprávy/PDF, může retry původní identity skončit bezpečným konfliktem 409 u poskytovatele, v aplikaci 503. Staré otevřené klienty bez requestId nový server odmítne 400; před první novou žádostí načíst aktuální stránku, ne však bez rozmyslu během nevyřešeného odeslání.

UUID není oprávnění ani rate limiter. Zůstávají Turnstile, honeypot, kontrola originu, velikosti, validace, dvojklikový zámek a Resend 429/kvóty. Dřívější obsahová deduplikace byla implicitní překážkou opakovaných stejných zpráv; záměrná nová žádost ji nyní překoná. Klientský útočník s platnými Turnstile tokeny může vytvářet nová UUID. Pro tvrdý limit na adresu/IP je potřeba samostatně schválený distribuovaný limiter; tato oprava jej nepředstírá a nepřidává externí účet ani službu.

## Bezpečná diagnostika

Serverové console.warn s pevnou značkou email_delivery_failure vypisuje jen material, phase (configuration, validation, turnstile, content, pdf, resend), code z pevného seznamu a případně HTTP status poskytovatele. Žádné adresy, tokeny, requestId, idempotency klíče, obsah ani surové výjimky. Chyba loggeru nemění odpověď. Pouze rozpoznané Resend 409 concurrent_idempotent_requests → concurrent_request a invalid_idempotent_request → payload_conflict dostávají bezpečné instrukce request_pending / request_conflict; veřejně zůstávají HTTP 503. Neznámé 409 zůstávají obecné. Resend 429 → veřejné 429 + Retry-After. Rozlišeny také timeout, síťová chyba, neplatná odpověď, neplatné PDF a zamítnuté ověření. Retenci infrastrukturních logů musí potvrdit vlastník.

## Jeden kontrolovaný produkční test (až po samostatném schválení)

1. Po schváleném deploymentu ověřit hash a načíst aktuální stránku. Použít pouze vlastní adresu vlastníka; nezaznamenávat ji ani token/klíč do dokumentace. Analytiku lze odmítnout.
2. Získat Turnstile ověření a jednou odeslat guide; neklikat opakovaně a nevyvolávat uměle timeout.
3. Ověřit 202 + accepted, odpovídající nový POST /emails a nový záznam průvodce v Resend Logs; pak skutečné doručení a otevření sedmistránkové přílohy. Oproti průvodci z předchozího dne musí jít o novou zprávu.
4. Pokud přijde chyba, neopakovat test bez posouzení: použít bezpečný phase/code/status ve Vercelu a odpověď v Resend Logs. Po nejistém výsledku neobnovovat stránku. Žádné surové exporty logů do ai-log.

Toto je původní plán kontroly opravy idempotence. Později vlastník potvrdil doručení obou materiálů a odmítnutí nepovolené adresy po nasazení dema; tím však není doloženo provedení všech bodů tohoto diagnostického plánu. Další skutečný test nadále vyžaduje samostatnou autorizaci.


## Cílené P2 opravy — 28. 10. 2026

API přidává veřejný kód input_rejected pouze k vlastní HTTP 400 z parsování/validace vstupu před ověřením a před Resendem. Kód popisuje jen právě odmítnutý pokus, nikoli celou historii žádosti. Externí Resend 400 jej nikdy nevytváří. Klient dovolí opravit adresu i scénář a při dalším kliknutí vytvoří nové UUID jen pokud nemá žádný dřívější nejistý výsledek. Historie je uložená v paměťovém snímku jako monotónní příznak uncertain. Timeout, síťová chyba, neplatné potvrzení, neoznačená 400 a ostatní chyby jej nastaví a pozdější input_rejected jej nikdy nesmaže. Nové údaje se čtou až při nové validní žádosti. Původní ochrana proti dvojkliku a čerstvý Turnstile token zůstávají.

Úspěšné hlavičky nejsou úplná odpověď: providerJson rozlišuje TimeoutError/AbortError → timeout; selhání streamu → network; SyntaxError při dekódování JSON → invalid_response; validní JSON s neočekávanou strukturou → unexpected_response. Kontroluje se objekt i relevantní typy polí Resend a Siteverify. Diagnostika nadále vypisuje pouze povolené kategorie a HTTP status; fáze zahrnují také validation pro chybu čtení příchozího streamu. HTTP 429 Resendu má přednost i při nečitelném těle a zůstává 429.

Pouze Resend 409 s přesným name=concurrent_idempotent_requests dostane veřejný kód request_pending a pokyn vyčkat před opakováním stejné žádosti. Přesné name=invalid_idempotent_request dostane request_conflict: UI zablokuje další odesílání téže žádosti (i synchronním ref guardem), ponechá UUID a vyzve k ověření původního zaslání či kontaktování správce. Nevytvoří automaticky novou žádost. Do klienta nejdou původní jména chyb, diagnostické objekty, ID poskytovatele ani obsah jeho odpovědi.
