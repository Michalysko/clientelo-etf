This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

Datový základ ETF Kompas, ověřené zdroje, metodika investičního modelu a omezení PRIIPs/KID: [dokumentace](docs/etf-data-and-model.md). Výpočetní testy: `npm test` (Node.js 24.12+).

Úvodní stránka obsahuje responzivní porovnání ETF a kalkulačku napojenou na tento model. Výchozí scénář 5 000 Kč měsíčně, 20 let a 7 % hrubého ročního výnosu je pouze ilustrativní předpoklad. Počáteční investice je podle stávající metodiky 0 Kč. Formuláře mají serverové odesílání HTML reportu a PDF průvodce přes Resend, chráněné Turnstile. Bez úplné konfigurace zůstane odesílání bezpečně nedostupné. Konverzní analytika Umami Cloud je volitelná a řízená souhlasem. Databáze kontaktů není implementovaná.

## Jednorázové materiály a konfigurace

Podrobné API, ochrany, testy a provozní omezení: [dokumentace doručování](docs/email-delivery.md).

Do lokálního `.env.local` patří následující proměnné. Jejich hodnoty nikdy nevkládejte do repozitáře, chatu nebo logů:

- `RESEND_API_KEY`: serverový klíč Resend.
- `RESEND_FROM_EMAIL`: adresa nebo `Název <adresa>` na ověřené doméně `etf.michalwebdeveloper.cz`.
- `TURNSTILE_SECRET_KEY`: soukromý serverový klíč Cloudflare Turnstile.
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`: pouze veřejný identifikátor widgetu, nikdy tajný klíč.
- `APP_ORIGIN`: přesný origin aplikace, lokálně například `http://127.0.0.1:3000`; v produkci vlastní HTTPS origin bez cesty.

Samostatná veřejná kontaktní položka: `PRIVACY_CONTACT_EMAIL`. Je určena pouze pro kontakt správce na stránce `/ochrana-osobnich-udaju`, nikoli pro odesílání přes Resend. Její hodnota se záměrně zveřejní návštěvníkům; nevkládat do ní tajemství. Bez platné adresy stránka ukáže „K doplnění / ověření“. Neexistuje fallback na `RESEND_FROM_EMAIL`. Kontakt se připravuje při buildu — po změně provést nový build/deployment. Veřejný kontakt je `privacy@michalwebdeveloper.cz`; vlastník dne 27. 10. 2026 potvrdil obousměrné ověření schránky. Je nastaven v ignorovaném lokálním prostředí; před nasazením jej nastavit samostatně také ve Vercelu.

## Ochrana osobních údajů

Stránka `/ochrana-osobnich-udaju` popisuje osobní nekomerční demo, skutečný tok údajů, poskytovatele a neověřené položky. Jméno správce Michal Růžička bylo výslovně poskytnuto vlastníkem pro zveřejnění; veřejná kontaktní adresa je `privacy@michalwebdeveloper.cz` a její příjem i odesílání ověřil vlastník. Odkaz je u obou formulářů, v informační sekci i patičce. Technický audit a přesný seznam zbývajících podkladů: [revize soukromí](docs/privacy-review.md).

Stránka zatím není právně dokončená pro veřejný sběr údajů: právní základy, konkrétní retence, přenosy a smluvní podmínky účtů vyžadují potvrzení. Zvlášť je třeba ověřit zpracovatelské ujednání pro plánovaný Vercel Hobby; veřejné DPA vymezuje Pro/Enterprise. Pro jednorázové materiály není zaveden preventivní souhlasový checkbox. Analytika má oddělenou dobrovolnou lištu se stejnocenným povolením a odmítnutím. To není tvrzení, že při libovolném budoucím nastavení poskytovatelů souhlas nikdy nebude potřebný. Výpočty, serverové ověření a doručování zůstávají beze změny.

V Cloudflare vytvořte Turnstile widget a povolte odpovídající hostname (lokální i budoucí produkční podle použití). Domény v konfiguraci Turnstile nezahrnují port. Po změně konfigurace proveďte nový build/restart; veřejný site key a stav dostupnosti formulářů se připravují při buildu. Na produkčním hostingu je nutné serverové proměnné nastavit samostatně. Testovací bypass klíče Turnstile nejsou pro skutečné odesílání povoleny.

`npm test` používá pouze testovací fakes a mockované poskytovatele, nečte `.env.local` a neodesílá zprávy. Produkční integrační test s Resendem není automatickou součástí testů ani buildu; vyžaduje samostatný souhlas vlastníka a jeho adresu. Přijetí zprávy Resendem znamená přijetí k odeslání, nikoli potvrzení doručení.

PDF je v `output/pdf/etf-od-nuly.pdf` mimo `public/`; doručuje se jen jako e-mailová příloha po validaci formuláře. Má sedm stran a přibližně 127 kB. Reprodukce: `python scripts/build-etf-guide.py` s ReportLab a pypdf a systémovými fonty Arial/Georgia; běžný build již vytvořené PDF pouze přibalí, negeneruje ho. Generátor používá stávající TypeScript model a data pro ilustrační příklad. PDF výstup je potřeba zahrnout do budoucího commitu spolu se zdrojem generátoru.

Na poslední straně průvodce je výzva k návratu do kalkulačky. Veřejná URL dosud není známá: dokument odkazuje na původní stránku slovně a výslovně uvádí doplnění odkazu po nasazení. Před veřejným spuštěním je potřeba upravit závěrečnou výzvu ve zdrojovém skriptu na skutečnou HTTPS adresu kalkulačky, PDF znovu vygenerovat a vizuálně ověřit. Lokální `APP_ORIGIN` se do statického PDF nepřenáší.

## Stav závěrečného auditu (26. 10. 2026)

- `npm test`: 53/53. Testy zahrnují serverovou validaci, přepočet, provider chyby, Siteverify, obsah reportu a nezávislý životní cyklus obou formulářů v izolovaném hook harnessu. Dvojklik a chybové stavy používají pouze mock fetch. Nejde o úplný automatizovaný test skutečného prohlížeče či všech e-mailových klientů.
- `npm run lint`: bez chyb.
- `npm run build -- --webpack`: produkční build prošel v prostředí se systémovými certifikáty. V PowerShellu pro důvěru místní certifikační autoritě: `$env:NODE_OPTIONS='--use-system-ca'` před příkazem. Ověřování TLS zůstává zapnuté.
- Výchozí `npm run build` s Turbopackem lokálně selhává při připojování pomocného PostCSS/CSS procesu (exit 0 před IPC spojením). Přesná příčina předčasného ukončení není prokázána. Závislosti ani výchozí build skript se kvůli tomu nemění; ověřenou alternativou je Webpack.
- Obě skutečná doručení a obsah materiálů potvrdil vlastník projektu. V závěrečném auditu agent neposílal další zprávy. Poslední drobné textové úpravy reportu a aktualizované PDF byly ověřeny lokálně, nikoli novým doručením.
- Před veřejným provozem musí vlastník doplnit úplné informace o správci a zpracování údajů podle [provozního seznamu](docs/email-delivery.md#před-veřejným-spuštěním--doplní-vlastník). Současná stránka jejich neúplnost viditelně označuje. Bez distribuovaného limiteru není garantovaný počet požadavků na IP/adresu ani tvrdý rozpočet odesílání.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Dobrovolná konverzní analytika (27. 10. 2026)

Implementace, přesné události, whitelist kampaní, limity a postup ověření: [docs/analytics.md](docs/analytics.md). Umami se načte až po souhlasu a jen v produkčním deploymentu na etf-kompas-zeta.vercel.app; localhost a preview neposílají události. Nejsou potřeba nové závislosti ani soukromý Umami klíč. Vlastník potvrdil EU region a Hobby.

V localStorage se pamatuje jen odmítnutí (verze, volba denied, čas), nejvýše 180 dní. Povolení je pouze v paměti otevřeného dokumentu i při klientské navigaci; po reloadu je třeba nový opt-in. Starší uložená povolení se neobnovují. Změna je pod patičkou. Odvolání zavře gate a při úspěšném uložení odmítnutí obnoví stránku (ztratí se rozpracované neodeslané údaje); při chybě zápisu zůstane stránka bez měření s upozorněním. Před souhlasem se nesbírají aktivity pro pozdější odeslání. Umami zpracovává IP/UA a odvozené identifikátory; nejde o zcela anonymní ani výhradně evropské zpracování. Payload neobsahuje e-mail, hash, částky, výnosy, tokeny ani libovolné URL parametry.

Funnel: landing_view → form_view → form_start → form_submit → material_accepted, zvlášť report a guide. Úprava kalkulačky není povinný krok. Pageview a landing_view jsou dva různé záznamy, nesčítají se jako návštěvy. Konverze je přijetí požadavku Resendem, ne doručení nebo nový unikátní kontakt. Opakovaný idempotentní pokus může také vrátit 202. Výsledky reprezentují pouze souhlasící a neblokované prohlížeče.

Budoucí A/B hypotézy: A (nákladovost) může zvýšit konverzi reportu, B (vzdělávání) průvodce. Rozlišení utm_content=ad_a/ad_b a jediná pomocná vlastnost ad_variant. Nejsou to výsledky experimentu. Účet ani reporty nebyly měněny; možnosti filtrování konkrétního funnelu je nutné ručně ověřit, viz dokumentace.

Testy používají fake providery a síť. Volitelný test skutečného vendor trackeru vyžaduje UMAMI_TRACKER_TEST_FILE s dočasným veřejným script.js; spouští jej jen v izolované VM s mock fetch. Bez souboru se tento jeden test přeskočí. Produkční Network a dashboard bude potřeba ověřit po samostatně schváleném deploymentu; tato etapa nic nenasazuje ani neposílá reálné e-maily.


## Idempotence jedné žádosti (28. 10. 2026)

Každá nová vědomá žádost má náhodné UUID v4; opakování po nejistém výsledku zachovává stejnou identitu, adresu a scénář. Automatické retry není implementované. Po 202 + accepted lze podat novou žádost s novým UUID, i o stejný PDF průvodce. Po nejistém výsledku použijte „Zopakovat stejnou žádost“, nové Turnstile ověření a neobnovujte stránku: paměť žádosti by se ztratila. Retry je v UI omezeno na 23 hodin; Resend drží klíče 24 hodin. Přijetí není doručení. Nejde o per-email rate limiter; limity Resendu a ochrana Turnstile zůstávají. Technické hranice, bezpečná diagnostika a plán jednoho schváleného produkčního testu: [email-delivery.md](docs/email-delivery.md).

Oprava P2: vlastní validační odmítnutí před odesíláním umožní opravit údaje a vytvořit novou žádost pouze bez historie nejistého výsledku. Po timeoutu zůstává původní identita i po pozdější 400. Trvalý rozpoznaný konflikt zastaví další retry; souběh doporučí vyčkat. Diagnostika rozlišuje i timeout těla odpovědi, chybu streamu, JSON a struktury.

## Reklamy A/B a konverzní plán

Přesné texty dvou reklam, publikum, CTA, cílové odkazy, definice funnelu, pracovní cíl 5 % (pouze hypotéza) a tři prioritizované experimenty jsou v [docs/ads-and-conversions.md](docs/ads-and-conversions.md). Nejde o spuštěné kampaně nebo naměřené výsledky.

Schválené odkazy bez změny implementace: [A](https://etf-kompas-zeta.vercel.app/?utm_content=ad_a) a [B](https://etf-kompas-zeta.vercel.app/?utm_content=ad_b). `utm_content` je vstupní URL parametr; `ad_variant` je odvozená vlastnost analytické události (ad_a/ad_b/unknown), nikoli parametr reklamního odkazu. Alias nebyl vybrán a žádná jeho implementace není plánována v tomto kroku. Hlavní funnel landing_view → form_view → form_start → form_submit → material_accepted nevyžaduje calculator_change ani etf_change. Přijetí požadavku není potvrzení doručení. Konkrétní filtry funnelu v účtu Umami zůstávají k ručnímu ověření.
