# Konverzní analytika — Umami Cloud

Stav implementace: 27. 10. 2026. Bez deploymentu a skutečných analytických událostí do produkčního účtu. Žádné nové závislosti. Serverové API, Resend, Turnstile a výpočetní model se nemění.

## Konfigurace a hranice

- Script: https://cloud.umami.is/script.js; sběr aktuálního trackeru: https://gateway.umami.is/api/send.
- Veřejné Website ID: `55615934-0f26-4e71-b7b2-d93427020fa6` — není API klíčem. Žádný Umami API klíč není potřeba.
- Skript se renderuje až po souhlasu, pouze pokud server má `NODE_ENV=production` a `VERCEL_ENV=production` a prohlížeč má přesný hostname `etf-kompas-zeta.vercel.app`. Localhost, dev a preview měření nespouštějí. Kontroly prostředí se nesmějí oslabovat jen kvůli lokálnímu testu.
- EU region a Hobby jsou potvrzení vlastníka, nikoli audit přihlášeného účtu. Sekce Events, Funnels a UTM podle vlastníka existují. Filtrování konkrétního funnelu podle UTM/event properties nebylo v účtu ověřeno. Nevymýšlíme výsledek ani naměřené konverze.
- Načítání přes Next.js `next/script`, `afterInteractive`, pouze uvnitř klientského provideru. `data-auto-track=false`, `data-auto-pageview=false`, `data-performance=false`. Žádné automatické click listenery/History patching, identify, Distinct ID, výkon, replay ani heatmapy z našeho kódu.

## Souhlas

Lišta je v běžném toku nad hlavičkou, nikoli překryv či modal. Tlačítka mají stejný vizuální styl a minimálně 44 px. Nastavení je dostupné pod patičkou na všech stránkách. Při otevření nastavení dostane fokus nadpis, bez focus trapu. Kalkulačka i oba formuláře fungují nezávisle na volbě.

Právním základem zvolené analytiky je souhlas. Preference `etf-kompas.analytics-consent.v1` v localStorage obsahuje jen verzi 1, denied a čas odmítnutí. Odmítnutí je použitelné nejvýše 180 dní; při dalším čtení se expirovaný/neplatný záznam podle možností odstraní. Pokud odstranění selže, záznam se nikdy nepovažuje za platné povolení. Fyzické smazání není možné bez návštěvy webu a funkčního úložiště. Není to retenční slib Umami.

**Povolení zůstává pouze v paměti aktuálního dokumentu**, včetně běžné klientské navigace. Po reloadu, plné navigaci nebo v jiné kartě je nutný nový výslovný opt-in. Pagehide zavírá gate i před zmrazením do BFCache; obnovení dokumentu z BFCache rovněž vyžaduje nové potvrzení. Staré persistentní granted záznamy z předchozí implementace se nikdy neaktivují a podle možností se odstraní. Toto konzervativní rozhodnutí řeší nemožnost spolehlivě trvale uložit odvolání při výpadku úložiště: žádný nový dokument nespoléhá na staré povolení. Není potřeba URL fragment ani návštěvnický identifikátor. Platnost povolení v jednom dlouho otevřeném dokumentu je navíc omezena na 180 dní; kontroluje se při každé události i v before-send, nejen periodickým UI časovačem.

Odvolání okamžitě zavře gate, zahodí fronty, zneplatní analytické pokusy a odpojí transport. Pokud se denied podaří uložit, reload odstraní vendor closure. Pokud zápis selže, stránka se neobnoví, zůstane zavřený gate i before-send a UI oznámí, že preference není trvale uložená. Opětovný explicitní souhlas může měření znovu aktivovat, ale focus, kotva, navigace ani zotavení úložiště ho nenahrazují. Již odeslané požadavky nelze vzít zpět.

Mezi kartami stejného originu se předává pouze odmítnutí přes storage event a dostupný BroadcastChannel `etf-kompas.analytics-consent.v1`, zpráva `denied`. Povolení se nešíří do jiných karet. Příjemce zavře gate a při dřívějším povolení obnoví dokument. Pokud prohlížeč zablokuje oba komunikační kanály i zápis do sdílené storage, okamžitou notifikaci izolovaných již povolených karet nelze garantovat; odvolat v každé takové kartě nebo je zavřít. Při novém načtení už žádná staré povolení neobnoví. Není zde slib synchronizace mezi různými originy, profily nebo zařízeními.

Před souhlasem nevytváříme frontu historie ani analytický IntersectionObserver. Po souhlasu je při pomalém načítání trackeru paměťová fronta maximálně 32 transportních záznamů. Pro asynchronní viditelnost je navíc omezená fronta nejvýše 16 formulářových událostí na materiál. Přetečení/výpadek znamená ztrátu analytiky, nikdy blokaci aplikace. Žádné offline replay úložiště ani automatické opakování odeslaných událostí.

## Události

| Název | Spouštěč a povolené vlastnosti |
| --- | --- |
| landing_view | Jednou na měřený vstup na `/`; `ad_variant` |
| calculator_change | Blur po skutečné platné změně; `field=monthly_contribution/years/gross_return`, `ad_variant`. Žádné hodnoty. Změna před souhlasem bez další editace po souhlasu se neodešle. |
| etf_change | Skutečná změna selectu; `position=first/second`, `ticker=SPY/SPYM/VOO/IVV`, `ad_variant` |
| form_view | IntersectionObserver: nejméně 10 % formuláře ve viewportu; jednou na formulář v měřeném vstupu; `material=report/guide`, `ad_variant` |
| form_start | První focus/pointer interakce formuláře; odeslána jednou až po pozorovaném form_view; `material`, `ad_variant` |
| form_submit | Po klientské validaci těsně před existujícím POST; `material`, `attempt=first/repeat`, `ad_variant` |
| material_accepted | Pouze HTTP 202 a JSON `status=accepted`; `material`, `attempt`, `ad_variant` |
| form_error | `material`, `error=validation/verification/busy/server/network`, případně `attempt`, `ad_variant` |

`attempt` je jen první/opakovaný pokus o materiál v dokumentu; interní čítač a epoch souhlasu se nikam neodesílají. Stejný pokus lze dokončit analyticky jen jednou. Epoch zachycuje i měřený vstup: po opuštění landing page nebo změně explicitní kampaně se pozdní dokončení zahodí, nikdy nepřiřadí nové reklamě. Nativní invalid formulář může mít form_error bez form_submit. Nenahráváme hodnoty, stisky kláves, chyby ověření při pouhém načtení ani DOM snapshoty. Pokus zahájený před souhlasem a dokončený po něm se zpětně nepřidá. Žádné připojení analytických polí k e-mailovému API, žádné změny jeho allowlistu. Focus může předběhnout IntersectionObserver: v paměti se podrží pouze skutečnost interakce, form_start a případné další události se uvolní v pořadí až po skutečném form_view. Mount sám view nevytváří. Bez pozorované viditelnosti se buffer nepředá, při změně vstupu/souhlasu se zahodí.

## Sanitizace a metadata

Typovaný wrapper a druhá runtime validace všech událostí. `data-before-send` je synchronní globální funkce definovaná před načtením scriptu. Přijme pouze event payloady, odmítá identify/performance a neznámé názvy/vlastnosti. Payload se sestavuje znovu z allowlistu, bez rozbalení původních metadat.

Odesílá se pevné Website ID, hostname, titul ETF Kompas, cesta `/` se sanitizovanými UTM, omezený referrer, povolený název/vlastnosti. Referrer jen origin známých facebook/instagram/google/linkedin hostů uvedených v kódu; ostatní prázdný. Žádné cesty, query, login údaje nebo fragmenty referreru. Metadata screen/language/id/tag/default title se neodesílají. Globální Next metadata nastavují `Referrer-Policy` prostřednictvím meta `referrer=no-referrer`, script také `referrerPolicy=no-referrer`. To omezuje HTTP Referer, nikoli IP/UA.

Aktuální tracker přesto již při spuštění čte rozměry, jazyk, location, referrer a localStorage `umami.disabled`; filtr brání jejich nechtěnému odeslání, ne samotnému čtení. HTTP spojení zpřístupňuje Umami IP a User-Agent. Tracker má paměťový `x-umami-cache` z odpovědi služby; nevytváříme jej ani ho neukládáme, ale jde o další provozní metadata služby, nikoli o naši záruku anonymity. Umami používá odvozené identifikátory; naše aplikace žádné vlastní nepřidává. Po souhlasu proto nejde o tvrzení „bez jakékoli identifikace“. HTTP hlavičky spravované prohlížečem nelze sanitizovat hookem.

## UTM a reklamy

Whitelist názvů i celých hodnot:

- source: meta, facebook, instagram, google, linkedin, clientelo, demo
- medium: paid_social, cpc, social, referral, demo
- campaign: clientelo_demo, etf_kompas
- content: ad_a, ad_b

Neznámé i duplicitní parametry se zahodí. Osobní údaje pod známým názvem neprojdou. UTM se vyhodnotí až po souhlasu a kontext držíme jen v paměti povoleného dokumentu. Cesta ad_a → soukromí → holé / jej zachová. Nový explicitní povolený kampanový odkaz ho nahradí. Plné načtení dokumentu, návrat z BFCache, reload nebo odvolání jej zruší. Query-only App Router navigaci sleduje malý useSearchParams observer ve vlastní Suspense hranici; statický obsah stránky zůstává mimo ni. Neplatná explicitní kampanová hodnota přepne kontext na unknown, nepřevezme starou reklamu. Otevření soukromí před prvním souhlasem se zpětně nedoplňuje: pokud při povolení už UTM v dostupné URL není, atribuce zůstane unknown. Kontext se nepřenáší mezi kartami nebo zařízeními. Stejná sanitizovaná URL se používá i na následných událostech; neukládáme čtyři duplicitní event properties. Jediná doplňující `ad_variant=ad_a/ad_b/unknown` usnadňuje porovnání událostí, pokud UTM filtr v konkrétním funnelu nefunguje. Tato fallback vlastnost neznamená, že jsme ověřili ovládání dashboardu. Pokud ani event filtr není v reportu použitelný, porovnat Events přehledy s touto vlastností a uvést, že nejde o filtrovaný sekvenční funnel; neodvozovat falešná čísla.

Odkazy pro budoucí reklamy:

- A: https://etf-kompas-zeta.vercel.app/?utm_source=meta&utm_medium=paid_social&utm_campaign=clientelo_demo&utm_content=ad_a
- B: https://etf-kompas-zeta.vercel.app/?utm_source=meta&utm_medium=paid_social&utm_campaign=clientelo_demo&utm_content=ad_b

Hypotéza A: sdělení o nákladovosti zvýší zájem o personalizovaný report. Hypotéza B: vzdělávací sdělení zvýší zájem o průvodce. Jsou to návrhy hypotéz, ne hotové reklamy ani výsledky experimentu. Pro férové srovnání držet stejné publikum, období a rozpočet. Bez nákladových dat reklam nelze určit cenu za konverzi.

## Interpretace a funnel

Jeden ručně poslaný pageview (bez name) + jeden pojmenovaný landing_view. Automatické pageviews vypnuté. Dva záznamy nejsou dvě návštěvy a nesmějí se sčítat. Strict Mode nebo opakovaný onReady nevytvoří další pageview. Nový dokument nebo návrat na `/` z jiné cesty je nový měřený vstup. Změna fragmentu není nový vstup.

- Pageview: zaznamenání zobrazení stránky od aktivace měření.
- Událost: interakce nebo výsledek, nikoli automaticky další zobrazení.
- Návštěva a unikátní návštěvník: odvozené metriky služby; nejsou důkazem počtu fyzických osob a neodpovídají počtu HTTP požadavků. Umami používá IP/UA a rotující sůl.
- Konverze: potvrzená odpověď aplikace po přijetí Resendem, nikoli doručení do schránky, unikátní kontakt nebo nově vytvořený e-mail. Idempotentní opakovaný požadavek může také skončit 202.

Dva funnely: landing_view → form_view → form_start → form_submit → material_accepted, filtrovat material=report nebo guide; zvolit konzistentní časové okno, například 60 minut. Změna kalkulačky není povinný krok. Porovnávat konvertující měřené návštěvy ve stejném funnelu, ne dělit prosté součty opakovaných pokusů návštěvníky a nepovažovat to automaticky za procento osob. Měření pokrývá pouze souhlasící a neblokované prohlížeče; poměr nelze zobecnit na všechny návštěvníky. Žádné výsledky nejsou zatím k dispozici.

## Ověření bez skutečných e-mailů

1. `npm run dev -- --webpack`, v prohlížeči localhost: před volbou ani po povolení se Umami nenačte (produkční guard). Vyzkoušet odmítnutí, kalkulačku, obě formulářová UI a Nastavení analytiky. Odesílání netestovat skutečnou adresou.
2. `npm test` testuje kontroler, provider a komponenty s fake React/DOM/fetch. Žádné skutečné e-maily ani události. Test skutečného trackeru se standardně přeskočí, protože vendor soubor se neukládá do repozitáře.
3. Pro izolovaný test aktuálního skutečného trackeru uložit veřejný script.js do dočasného souboru, nastavit pouze pro testovací proces `UMAMI_TRACKER_TEST_FILE` na jeho cestu a spustit `npm test`. VM má mock fetch; nic neposílá do Umami. Nikdy tento test nenahrazovat vyhodnocením trackeru v neizolovaném Node/browser prostředí.
4. `npm run lint`; `$env:NODE_OPTIONS='--use-system-ca'; npm run build -- --webpack` v PowerShellu. Bez změn Application Control/TLS ověřování.
5. Po samostatně schváleném deploymentu: čistý profil, Network Preserve log, filtrovat umami. Před volbou/po odmítnutí žádný script.js ani gateway požadavek. Po povolení právě jeden pageview + landing_view, ručně prohlédnout payload i HTTP Referer. Žádná citlivá data ani další metadata. Odvolat; po reloadu žádné další Umami požadavky. Již odeslané nelze stáhnout zpět.
6. Projít A/B URL, obě cesty, viewport form_view a změny kalkulačky. V účtu ověřit Events, UTM, Funnels a skutečné možnosti jejich filtrů. Nezapisovat smyšlené výsledky. Pozitivní reálný emailový test vyžaduje další výslovný souhlas vlastníka; zatím jsou pouze mocky.

## Primární zdroje

- https://docs.umami.is/docs/tracker-configuration — auto-track, before-send, metadata
- https://docs.umami.is/docs/tracker-functions — vlastní pageviews/payloady
- https://docs.umami.is/docs/metric-definitions — IP, UA, odvozená identifikace
- https://docs.umami.is/docs/cloud/faq — region, retence, spotřeba kvóty
- https://docs.umami.is/docs/funnel a https://docs.umami.is/docs/utm
- https://umami.is/dpa a https://umami.is/subprocessors
- https://nextjs.org/docs/app/guides/scripts — Next Script
- https://uoou.gov.cz/verejnost/qa-otazky-a-odpovedi/cookies — souhlas a nezbytné preference

Není to právní stanovisko ani potvrzení vyřešení dřívějších otevřených bodů hostingu a doručování.

## Opravy po závěrečném auditu (27. 10. 2026)

Původní fragmentový fallback umožňoval po selhání zápisu a obnově storage oživit starý souhlas. Byl odstraněn ve prospěch explicitního povolení v paměti dokumentu. Opraveno také připsání pozdního POST nové kampani, pořadí focus/observer, zachování post-consent kampaně při SPA návratu ze soukromí a expirace při odesílání. Regrese používají fake DOM/React, mock POST a BroadcastChannel; nejde o důkaz chování všech reálných browser profilů. Skutečné oddělené karty, BFCache a omezení storage na mobilním Safari zůstávají ruční kontrolou.

Finální kontroly této opravy: 83/83 testů včetně skutečného vendor trackeru v izolované VM s mock sítí. Bez souboru UMAMI_TRACKER_TEST_FILE se jeden volitelný vendor test standardně přeskočí. Žádné skutečné e-maily ani analytické události nebyly odeslány.
