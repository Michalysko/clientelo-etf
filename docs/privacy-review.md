# Revize informací o osobních údajích — 27. 10. 2026

## Účel a stav

Osobní nekomerční demonstrace pro výběrové řízení Clientelo. Nová App Router stránka `/ochrana-osobnich-udaju` je veřejně dostupná v aplikaci bez formulářů a bez vlastního Turnstile loaderu. Uvádí skutečné zpracování a zřetelné nedokončené položky. Neoznačuje nekomerční demo za výjimku z GDPR.

Vlastník poskytl jméno správce **Michal Růžička**, fyzická osoba. Následně dne 27. 10. 2026 určil veřejný e-mail `privacy@michalwebdeveloper.cz` a potvrdil jeho obousměrné otestování pro příjem i odesílání. Jde o potvrzení vlastníka; agent žádnou testovací zprávu neposílal. `PRIVACY_CONTACT_EMAIL` je oddělené serverové nastavení veřejného kontaktu; po validaci se zobrazí na stránce a v bezpečně zakódovaném mailto odkazu. Chybějící či neplatný kontakt nevede k použití odesílatele z Resendu. V takovém případě se ukáže nedokončená položka, zatímco obě stávající cesty doručování zůstávají funkčně beze změn. Stránka je prerenderovaná: změna kontaktu vyžaduje nový build/deployment.

## Co bylo ověřeno v kódu

| Oblast | Skutečný tok |
| --- | --- |
| Formuláře | E-mail, typ materiálu, honeypot, token; report navíc posílá zvolená ETF a modelové vstupy. Bez backendové registrace kontaktu. |
| Report handler | Validuje allowlist a znovu počítá existujícím modelem. Resendu předá příjemce a HTML/text se scénářem a výsledky. |
| Guide handler | Resendu předá příjemce, HTML/text a obecné PDF načtené z pevné cesty; neposílá scénář kalkulačky. |
| Cloudflare | Prohlížeč komunikuje přímo s Turnstile při načtení/ověření widgetu, i před odesláním. Serverový Siteverify payload obsahuje secret a response token; neobsahuje e-mail, scénář ani explicitně remoteip. To nevylučuje zpracování IP prohlížeče u Cloudflare. |
| Opakované požadavky | HMAC identifikátor Resendu je odvozený z celého payloadu včetně příjemce. Není databází kontaktů ani tvrzením o anonymitě. |
| Ukládání | Runtime kód neobsahuje databázi ani zápis formulářů do souboru. PDF se jen čte. Resend a další infrastruktura mohou údaje uchovávat. |
| Logy | Kód src nemá console log/info/warn/error/debug volání a handler nevrací interní výjimky. Provozní logování poskytovatelů nebylo z účtů ověřeno. |
| Úložiště/analytika | Vlastní kód nevolá document.cookie/cookies, localStorage ani sessionStorage pro kontakty; nemá Vercel Analytics, Google Analytics nebo marketingový pixel. Použití Turnstile není absence zpracování. |
| Písma | `next/font/google` fonty připraví při buildu a obsluhuje z aplikace. Návštěvnická stránka neobsahuje Google Fonts stylesheet. |
| Hosting | Vercel je plánovaný. Nasazení ani konkrétní smluvní/regionální konfigurace nebyly potvrzeny. Pokud ho použijeme, budou přes něj procházet i formulářové požadavky. |

Při původní revizi nebyly otevřeny účty poskytovatelů ani odeslány zprávy. Následný krok doplnil pouze veřejný kontakt do .env.local se zachováním ostatního obsahu; žádné tajné hodnoty nebyly vypsány a skutečné zprávy nebyly agentem odeslány.

## Právní základ a checkbox

Kód technicky prokazuje jednorázovou žádost o materiál, nikoli sám o sobě všechny podmínky konkrétního právního titulu. Proto stránka nevydává doručení za potvrzený souhlas nebo smluvní plnění. Před veřejným provozem musí správce určit titul pro doručení i ochranu formulářů a zaznamenat jeho odůvodnění.

Pro posouzení smluvního plnění podle čl. 6 odst. 1 písm. b) je třeba nejdříve doložit skutečný vztah bezplatné služby a nezbytnost zpracování pro tento vztah. Při případném oprávněném zájmu podle písm. f) doložit účel, nezbytnost a vyvážení zájmů. Pokud by se správce rozhodl pro souhlas podle písm. a), musí být konkrétní, informovaný, prokazatelný a odvolatelný; současné vyžádání materiálu se automaticky za takový mechanismus neprohlašuje. Konkrétní titul nebyl svévolně zvolen ani uživateli podstrčen.

Preventivní checkbox „souhlasím se zásadami“ nepřidán: pouhé seznámení s informacemi není samostatným právním základem. Jednorázová žádost není marketingový odběr. Nová stránka a odkazy nejsou zavedením evidovaného souhlasu.

## Cookies a banner

Nepřidán banner, protože audit vlastního kódu nezjistil analytické nebo marketingové ukládání. To nevylučuje chování Turnstile, hostingu, e-mailového trackingu ani změnu jejich nastavení. Před veřejným spuštěním ověřit skutečné úložiště a síťové požadavky v produkčním prohlížeči, nastavení pre-clearance a doménový tracking Resendu. Souhlas podle pravidel pro cookies a právní základ následného zpracování osobních údajů jsou rozdílné otázky. Nepotřebné technologie vyžadující souhlas nesmí být spuštěny jen na základě odkazu na tuto stránku.

## Přesný seznam k doplnění nebo potvrzení vlastníkem

1. Kontakt je určen a lokálně nastaven: `privacy@michalwebdeveloper.cz`. Příjem i odesílání potvrdil vlastník. Před deploymentem nastavit `PRIVACY_CONTACT_EMAIL` také v produkčním prostředí a potvrdit postup vyřizování žádostí. Nevyžaduje se zveřejnění smyšleného IČO nebo neověřené adresy bydliště.
2. Potvrdit právní základ jednorázového doručení a ochrany formulářů, včetně potřebného odůvodnění a dokumentace. Případně doplnit odpovídající mechanismus až na základě tohoto rozhodnutí.
3. Resend: ověřit skutečně použitelné podmínky/DPA, zpracovatele, region a retenci e-mailového obsahu, metadat a událostí. Veřejná dokumentace uvádí standardních 30 dnů; neprezentujeme to jako audit účtu. Zkontrolovat open/click tracking a nastavit podle deklarovaného účelu.
4. Cloudflare: ověřit podmínky účtu, Turnstile režim a pre-clearance, retenci signálů a poskytovatelem deklarované vlastní zpracování. Rozlišovat ochranu webu na pokyn provozovatele a vlastní zlepšování detekce.
5. Hosting: potvrdit skutečný Vercel projekt/tarif, role, logy a regiony. Veřejné DPA je výslovně vymezené pro Pro/Enterprise; pro plánovaný Hobby vyžádat potvrzení použitelného ujednání. Neuzavře-li se tento bod, zvolit vhodný tarif/hosting, bez automatické implementace placené služby.
6. U všech poskytovatelů určit relevantní příjemce/subprocesory a země zpracování, konkrétní mechanismy přenosu mimo EHP a případná další opatření. Samotný odkaz na SCC či DPF neprokazuje vyřešení konkrétního přenosu.
7. Určit a zveřejnit skutečné retenční lhůty/kritéria a postup odstranění u poskytovatelů; zahrnout provozní logy a korespondenci při uplatňování práv, ne pouze kontakty v aplikaci.
8. V produkčním prohlížeči ověřit cookies a další úložiště, widget, hostingové doplňky a tracking. Podle výsledku přizpůsobit informace i případné řízení souhlasu. Aktualizovat datum po věcných změnách.

Do uzavření těchto bodů jde o **nedokončené informace pro veřejný sběr osobních údajů**, nikoli o potvrzení právní připravenosti. Funkční odesílání nebylo z tohoto důvodu technicky měněno ani obcházeno; veřejný deployment není součástí kroku.

## Primární podklady (ověřováno 27. 10. 2026)

- [EDPB: právní základy](https://www.edpb.europa.eu/sme/be-compliant/process-personal-data-lawfully_en), [práva a transparentnost](https://www.edpb.europa.eu/sme/be-compliant/respect-individuals-rights_en)
- [ÚOOÚ: cookies a rozdíl mezi souhlasem s uložením a právním titulem](https://uoou.gov.cz/verejnost/qa-otazky-a-odpovedi/cookies)
- [Resend DPA](https://resend.com/legal/dpa), [retence](https://resend.com/docs/knowledge-base/account-quotas-and-limits#data-retention)
- [Cloudflare Turnstile Privacy Addendum](https://www.cloudflare.com/turnstile-privacy-policy/), [pre-clearance](https://developers.cloudflare.com/turnstile/additional-configuration/hostname-management/pre-clearance/)
- [Vercel DPA](https://vercel.com/legal/dpa), [Privacy Notice](https://vercel.com/legal/privacy-notice)

Veřejné podklady nevydáváme za potvrzení smluv či nastavení konkrétních účtů.
