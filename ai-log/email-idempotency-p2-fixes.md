# Cílené opravy dvou P2 nálezů — 28. 10. 2026

## Skutečné zadání

Uživatel požadoval opravit zamčené údaje po první validační 400 při zachování historie nejistých výsledků, klasifikaci selhání response.json a případně instrukce pro Resend 409. Výslovně bez commitu, push, deploymentu a skutečných e-mailů. Toto je autentický pracovní souhrn, nikoli export nebo smyšlený přepis. Navazuje na email-request-idempotency.md a následný read-only audit. Před úpravou znovu přečten formulář, handler, providery, testy a lokální Next.js route.md. Ověřeny oficiální názvy konfliktů na https://resend.com/docs/api-reference/errors.

## Rozhodnutí a opravy

- Server vrací veřejný enum input_rejected jen u vlastní validační/parsingové HTTP 400 ve fázi validation. Značka znamená pouze to, že tento pokus neprošel k Resendu, nikoli že žádný starší pokus nebyl přijat. Externí Resend 400 se nadále převádí na obecnou 503 bez této značky.
- Snímek logické žádosti nově obsahuje monotónní uncertain. První vlastní input_rejected bez předchozí nejistoty snímek uvolní, odemkne adresu a nová žádost znovu přečte aktuální adresu/scénář a vytvoří nové UUID. Timeout, síťová chyba, vadné potvrzení nebo neoznačená chyba nejistotu nastaví. Pozdější 400 ji nikdy nesmaže a původní identita i obsah zůstanou uzamčeny. Dvojklikový zámek a nové Turnstile ověření se nemění.
- Sdílené čtení odpovědi klasifikuje TimeoutError/AbortError jako timeout, chybu streamu jako network, SyntaxError jako invalid_response a validní JSON s nepoužitelnou strukturou jako unexpected_response. Kontroluje i typ success/hostname/action Siteverify a id Resendu. Chyby se převádějí na bezpečný DeliveryError bez původní zprávy. Diagnostika obsahuje jen material/phase/code/providerStatus a nově umí i fázi validation.
- 409 se klasifikuje podle přesně rozpoznaných názvů, nikoli jen statusu. concurrent_idempotent_requests → veřejná instrukce request_pending s doporučením vyčkat a zachovat identitu. invalid_idempotent_request → request_conflict, zastavení retry ve stavu i synchronním ref guardu, doporučení ověřit původní zaslání nebo kontaktovat správce. UUID se automaticky nemění. Neznámá 409 nepředstírá trvalý konflikt a zůstává obecná. HTTP 503 zůstává; veřejný enum není surová interní diagnostika. Resend 429 má přednost i při nečitelném těle.
- Aktualizovány README, docs/email-delivery.md a docs/privacy-review.md. Původní AI log zůstává historický, tento soubor popisuje nové chování. Nebyly přidány závislosti, služby ani úložiště.

## Skutečné testy

Nových 17 testů nad předchozí sadou. Cílený běh email-idempotency, email a turnstile-ui: 58/58. Finální kompletní běh npm test se stávající lokální Umami fixture: **109/109 prošlo, 0 selhání, 0 přeskočených**. Vendor tracker běží jen v izolované VM s mock fetch; jeho fixture se v tomto kroku nově nestahovala.

Regrese zahrnují: první 400 se značkou → oprava adresy/scénáře → nové UUID → 202; dvojklik během opraveného odesílání; timeout/503/neplatné potvrzení → pozdější značená 400 → stále původní UUID, adresa i scénář; neoznačená nebo neplatně označená 400; rozlišení a blokace konfliktů; externí Resend 400 bez značky; oba poskytovatele při timeoutu, abortu, přerušeném streamu, neplatném JSON a neočekávané struktuře. Těla streamů jsou ReadableStream fakes, žádné skutečné API volání. Diagnostické objekty ani veřejné odpovědi nesmějí obsahovat vložené syntetické citlivé texty. Stávající regrese kalkulačky, souhlasu a analytiky prošly.

npm run lint: exit 0. npx tsc --noEmit: exit 0. npm run build -- --webpack s NODE_OPTIONS=--use-system-ca: exit 0. git diff --check: bez chyb, pouze LF/CRLF upozornění. V tomto kroku nebyla nutná oprava selhávajícího testu; cílená i finální sada prošly. Node nadále vypisuje dřívější MODULE_TYPELESS_PACKAGE_JSON warning, bez změny balíčků.

## Hranice a stav

UI testy používají simulované React hooky a browser; nejsou skutečným browser testem plánování renderů, fokusu nebo živého Turnstile. Reálný produkční test je nadále samostatně schvalovaný krok podle docs/email-delivery.md. Dřívější omezení paměťové identity při reloadu/jiné kartě, 23/24 hodin, rotace HMAC tajemství a absence distribuovaného limiteru se nemění. Příčina původní produkční 503 není tímto prokázána ani zpětně vyřešena.

Kalkulačka, model, ETF data, obsah reportu/PDF, analytický kontroler, souhlasový provider a Turnstile provider zůstávají beze změn. Žádné produkční env změny, skutečné e-maily, analytické události, commit, push ani deployment. Předchozí lokální změny idempotence jsou zachované; tato oprava je stále necommitnutá.
