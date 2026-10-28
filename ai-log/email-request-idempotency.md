# Idempotence jedné logické žádosti — 28. 10. 2026

## Autentické zadání a rozsah

Uživatel požadoval „Jedna logická žádost = jeden idempotency klíč“, zachování ochrany a analytiky, diagnostiku 503 a testy bez skutečných zpráv, commitu, push či deploymentu. Podnětem byly vlastníkem popsané produkční pokusy PDF průvodce přibližně 21 hodin po předchozím zaslání. Údaje z Resend/Vercel účtů nebyly agentem nezávisle ověřeny. Předchozí read-only audit prokázal obsahovou deduplikaci v kódu, nikoli příčinu všech produkčních chyb.

Toto je souhrn skutečné práce a krátké citace zadání, ne export konverzace. Autentický export lze doplnit později. Před změnami přečten provider, handler, validace, formulář, obě routy, testy, email-delivery dokumentace a lokální Next.js 16 průvodce route.md. Oficiální podklady znovu otevřeny: https://resend.com/docs/dashboard/emails/idempotency-keys a https://resend.com/docs/api-reference/errors.

## Provedené změny

- UUID v4 vytvořené kryptograficky přes window.crypto.randomUUID až při nové validní žádosti. Příjemce a reportový scénář jsou součástí paměťového snímku. Po chybě se nemění, tlačítko výslovně nabízí opakování stejné žádosti. Každý pokus stále vyžaduje nový Turnstile token. Automatické retry nebylo v původní implementaci a není přidáno.
- Server vyžaduje requestId v přesném allowlistu a ověřuje UUID v4. Resend klíč v2 odděluje report/guide a používá serverový HMAC identity žádosti. Změněný příjemce/obsah pod stejnou identitou zachovává stejný klíč, aby Resend odmítl konflikt payloadu; nevytvoří se nový obsahově odvozený klíč, který by ochranu obešel. Server nadále tvoří obsah sám.
- Až 202 + accepted uvolní snímek a další vědomé odeslání dostane nové UUID. ID ani klíče nejsou v analytice. material_accepted zůstává potvrzením požadavku, nikoli doručením či unikátní zprávou.
- Nevyřešená žádost starší 23 hodin se klientem neopakuje. Úplné načtení stránky, odmountování nebo jiná karta snímek nezachová: UI varuje před reloadem a možným novým e-mailem. Není tvrzena trvalá nebo mezikartová deduplikace bez evidence. Resend má 24hodinové okno. Změna serverového tajemství může změnit klíč; změna šablony/PDF může vyvolat konflikt. Tyto limity jsou dokumentovány.
- Diagnostika přes stávající serverové console.warn obsahuje pouze allowlist material/phase/code/providerStatus. Fáze configuration/turnstile/content/pdf/resend, obecné kategorie timeout/network/provider_http/invalid_response/concurrent_request/payload_conflict/invalid_pdf/unavailable/verification_failed. Žádné e-maily, requestId, idempotency klíče, tokeny, obsah nebo surové výjimky. Selhání loggeru nemění tok.
- 409 z Resendu zůstává obecnou veřejnou 503, interně se odlišuje souběh a konflikt. 429 se stále vrací jako 429 s Retry-After. Turnstile se neobchází; false znamená 403, nedostupnost 503. PDF se pouze čte, negeneruje.
- Aktualizován README, technická a privacy dokumentace, veřejný popis náhodné žádosti/bezpečných logů a datum veřejné stránky na 28. 10. 2026.
- Bez nové databáze, závislostí nebo externí služby. Neexistoval distribuovaný limiter. Zachovány všechny dosavadní kontroly, Turnstile a limity Resendu; odstranění deduplikace všech stejných zpráv umožňuje záměrná nová zaslání. Tvrdý limit na adresu/IP by vyžadoval samostatné rozhodnutí. UUID je identita žádosti, nikoli oprávnění.

## Ověření a skutečné chyby během práce

- Nové mockované regrese: guide i report, retry po přijetí se ztracenou odpovědí → jeden simulovaný e-mail; nová žádost → nový klíč; souběh → 409 a pozdější bezpečné opakování; změna příjemce/obsahu → konflikt; neplatné/chybějící UUID; diagnostické fáze bez citlivých dat; 409/429/timeout; Siteverify výpadek. Stávající testy dál pokrývají odmítnuté ověření a chyby PDF. UI test drží původní adresu/scénář a UUID přes chybu sítě a nový token; po potvrzení vytváří nové UUID. Další test blokuje retry po 23 hodinách. Testy externí služby vždy mockují.
- První nový test měl chybějící uzavírací hranatou závorku v tabulce případů; opraveno před finálním během.
- Pomocný příkaz python místo interpreteru spustil Windows Python install manager; ten oznámil aktualizaci správce na 26.2 a následně selhal při hledání runtime/indexu. Skript úprav se přes Python neprovedl, proces byl ukončen; úpravy byly provedeny přes dostupný Node. Do aplikačních závislostí nebyl Python přidán.
- Dočasné soubory Windows sandboxu nejsou shodné s nesandboxovaným TEMP. Jeden úplný běh proto selhal pouze na ENOENT volitelné Umami fixture. Finální běh stáhl veřejný tracker a spustil testy v témže procesu. Aktuální SHA256: 8104CFAFDA3CC8286BE4F63D6C6E841D163E99BFB8F1ECA2F9069FED8814168D. Tracker se spouští jen ve VM s mock fetch, bez produkčních analytických událostí.
- Finální npm test: **92/92 prošlo, 0 selhání, 0 přeskočených**. npm run lint: exit 0. npx tsc --noEmit: exit 0. npm run build -- --webpack s NODE_OPTIONS=--use-system-ca: exit 0. Node vypisuje dřívější MODULE_TYPELESS_PACKAGE_JSON warning; package metadata nebyla kvůli němu měněna.
- git diff --check bez chyb, pouze LF/CRLF upozornění. Diff kalkulačky, výpočetního modelu, ETF dat, analytického kontroleru/provideru a package souborů je prázdný. Kontrola změněných souborů proti hodnotám lokálních klíčů a credential vzorům bez nálezu; hodnoty se nevypisovaly.

## Co nebylo ověřeno reálně

Nový flow nebyl v této etapě ověřen živým browser odesláním ani skutečným Resendem. Produkční příčina původní 503 zůstává neuzavřená. Přesný plán jednoho dalšího produkčního testu, až po samostatném schválení vlastníkem a deploymentu, je v docs/email-delivery.md. Zprávu poslat jen jednou na vlastní adresu vlastníka, ověřit nový Resend záznam, doručení a PDF; při chybě nejprve diagnostika, nikoli další neřízené pokusy.

Žádné skutečné e-maily, produkční env změny, analytické události, commit, push ani deployment. Změny zůstávají lokální pro kontrolu.
