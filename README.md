This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

Datový základ ETF Kompas, ověřené zdroje, metodika investičního modelu a omezení PRIIPs/KID: [dokumentace](docs/etf-data-and-model.md). Výpočetní testy: `npm test` (Node.js 24.12+).

Úvodní stránka obsahuje responzivní porovnání ETF a kalkulačku napojenou na tento model. Výchozí scénář 5 000 Kč měsíčně, 20 let a 7 % hrubého ročního výnosu je pouze ilustrativní předpoklad. Počáteční investice je podle stávající metodiky 0 Kč. Formuláře mají serverové odesílání HTML reportu a PDF průvodce přes Resend, chráněné Turnstile. Bez úplné konfigurace zůstane odesílání bezpečně nedostupné. Konverzní analytika ani databáze kontaktů nejsou implementované.

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

Stránka zatím není právně dokončená pro veřejný sběr údajů: právní základy, konkrétní retence, přenosy a smluvní podmínky účtů vyžadují potvrzení. Zvlášť je třeba ověřit zpracovatelské ujednání pro plánovaný Vercel Hobby; veřejné DPA vymezuje Pro/Enterprise. Nejsou zavedeny preventivní checkbox ani cookie banner. To není tvrzení, že při libovolném budoucím nastavení poskytovatelů souhlas nikdy nebude potřebný. Výpočty, serverové ověření a doručování zůstávají beze změny.

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
