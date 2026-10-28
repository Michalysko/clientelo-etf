import type { Metadata } from "next";
import Link from "next/link";
import { getPrivacyContact, PRIVACY_CONTROLLER_NAME, PRIVACY_UPDATED_ON } from "@/lib/privacy";

export const metadata: Metadata = {
  title: "Ochrana osobních údajů | ETF Kompas",
  description: "Jak osobní nekomerční demo ETF Kompas zpracovává údaje při jednorázovém zaslání reportu a PDF průvodce a které informace ještě vyžadují doplnění.",
};

export default function PrivacyPage() {
  const contact = getPrivacyContact();
  return <>
    <a className="skip-link" href="#ochrana-obsah">Přejít na obsah</a>
    <header className="site-header wrap">
      <Link href="/" className="brand" aria-label="ETF Kompas — úvod">ETF<span>Kompas</span></Link>
      <nav aria-label="Hlavní navigace"><Link href="/#kalkulacka">Zpět ke kalkulačce <span aria-hidden="true">↗</span></Link></nav>
    </header>
    <main id="ochrana-obsah" className="privacy-page wrap">
      <div className="privacy-intro">
        <p className="eyebrow">OSOBNÍ DEMO / OCHRANA ÚDAJŮ</p>
        <h1>Soukromí v ETF Kompasu</h1>
        <p className="privacy-lead">E-mail pro jeden vyžádaný materiál. Žádný automatický marketing.</p>
        <p>ETF Kompas je osobní, nekomerční demonstrační projekt vytvořený pro výběrové řízení ve společnosti Clientelo. Nejde o komerční investiční službu. Také při provozu tohoto dema ale dochází ke zpracování osobních údajů.</p>
        <p className="small muted">Poslední aktualizace: <time dateTime={PRIVACY_UPDATED_ON}>28. 10. 2026</time></p>
      </div>
      <aside className="privacy-notice" aria-labelledby="privacy-draft-title">
        <h2 id="privacy-draft-title">Co ještě zbývá doplnit</h2>
        <p>Popis níže vychází z aktuálního kódu a veřejných podkladů poskytovatelů. {contact ? "Právní základy" : "Veřejný kontakt, právní základy"} a konkrétní provozní podmínky označené <strong>„K doplnění / ověření“</strong> ještě nejsou všechny potvrzené. Před veřejným sběrem údajů je musí správce uzavřít; tato stránka zatím nepředstavuje dokončené informace pro veřejný provoz.</p>
      </aside>
      <nav className="privacy-toc" aria-label="Obsah ochrany osobních údajů">
        <a href="#spravce">Správce a kontakt</a><a href="#ucely-a-zaklady">Účely a právní základy</a><a href="#zpracovane-udaje">Zpracované údaje</a><a href="#poskytovatele">Poskytovatelé</a><a href="#uchovavani">Uchovávání</a><a href="#prenosy">Přenosy mimo EHP</a><a href="#cookies">Cookies a úložiště</a><a href="#analytika">Dobrovolná analytika</a><a href="#vase-prava">Vaše práva</a>
      </nav>
      <section id="spravce" className="privacy-block" aria-labelledby="spravce-title">
        <h2 id="spravce-title">1. Kdo je správcem a jak ho kontaktovat</h2>
        <p>Správcem je <strong>{PRIVACY_CONTROLLER_NAME}</strong>, fyzická osoba provozující osobní nekomerční demo ETF Kompas. Společnost Clientelo je uvedena jako kontext výběrového řízení; tato stránka ji neoznačuje za správce údajů návštěvníků.</p>
        {contact ? <p>Veřejný kontakt pro dotazy a uplatnění práv: <a href={contact.href}>{contact.email}</a>.</p> : <p className="privacy-pending"><strong>K doplnění / ověření:</strong> veřejný kontaktní e-mail správce zatím není určen. Správce musí doplnit skutečnou adresu a ověřit její funkčnost před veřejným spuštěním.</p>}
      </section>
      <section id="ucely-a-zaklady" className="privacy-block" aria-labelledby="ucely-title">
        <h2 id="ucely-title">2. Proč údaje zpracováváme a na jakém základě</h2>
        <p>E-mail zadáváte dobrovolně, abychom vám jednorázově doručili vámi vyžádaný personalizovaný HTML report nebo sedmistránkového PDF průvodce. U reportu potřebujeme také parametry scénáře pro serverový přepočet a sestavení zprávy. Základní kalkulačku můžete používat bez zadání e-mailu; bez adresy nemůžeme vyžádaný materiál doručit.</p>
        <p>Dalším účelem je ochrana formulářů a doručování před roboty, zneužitím a duplicitními požadavky. K tomu slouží Turnstile, technická pole formuláře a náhodný identifikátor jedné žádosti. Identifikátor a původní údaje žádosti si formulář při opakování drží jen v paměti otevřené stránky; neposílá je do analytiky. Pro řešení provozních chyb server zaznamenává pouze druh materiálu, fázi chyby, obecnou kategorii a případně HTTP stav poskytovatele, bez adres, tokenů, obsahu a identifikátorů žádostí.</p>
        <p>Volitelnou analytiku návštěvnosti, používání kalkulačky, formulářů a porovnání reklamních variant zpracováváme na základě vašeho souhlasu. Odmítnutí ani odvolání souhlasu neomezuje kalkulačku nebo zaslání materiálů. Tento souhlas je oddělený od jednorázového doručení a neznamená přihlášení k marketingu.</p>
        <p className="privacy-pending"><strong>K doplnění / ověření — právní základ:</strong> správce musí před veřejným provozem určit a doložit právní základ zvlášť pro doručení materiálu a ochranu formulářů. Samotné kliknutí na zaslání zde nevydáváme za prokázané uzavření smlouvy ani za univerzální souhlas se zpracováním. U ochrany je třeba posoudit nezbytnost a přiměřenost použitých technologií.</p>
        <p><strong>Jednorázové vyžádání materiálu neznamená přihlášení k newsletteru ani ETF Hlídači.</strong> Aplikace žádný takový odběr neaktivuje a nevytváří marketingový seznam.</p>
      </section>
      <section id="zpracovane-udaje" className="privacy-block" aria-labelledby="udaje-title">
        <h2 id="udaje-title">3. Jaké údaje skutečně procházejí aplikací</h2>
        <ul>
          <li><strong>Oba materiály:</strong> e-mailová adresa, typ vyžádaného materiálu a technická pole formuláře — ověřovací token Turnstile a skryté pole proti robotům.</li>
          <li><strong>Personalizovaný report:</strong> zvolená ETF, měsíční vklad, horizont, předpokládaný hrubý výnos a počáteční investice, která je v současném modelu pevně nulová. Server z nich spočítá modelové výsledky a roční přehled.</li>
          <li><strong>PDF průvodce:</strong> obecný dokument, ke kterému se nepřipojují parametry vaší kalkulačky.</li>
          <li><strong>Technický provoz:</strong> síťové údaje včetně IP adresy, informací o prohlížeči a požadavku mohou zpracovávat hosting a bezpečnostní poskytovatel. Turnstile komunikuje přímo s prohlížečem při načítání a ověřování widgetu, tedy i před odesláním e-mailového formuláře.</li>
        </ul>
        <p>Vstupy kalkulačky jsou modelové předpoklady, nikoli ověřené údaje o vašem majetku. Nezadávejte čísla účtů, přístupové údaje ani jiné nepotřebné osobní informace.</p>
      </section>
      <section id="poskytovatele" className="privacy-block" aria-labelledby="poskytovatele-title">
        <h2 id="poskytovatele-title">4. Kdo se na zpracování podílí</h2>
        <article>
          <h3>Resend — doručení zprávy</h3>
          <p>Server předá službě Resend adresu příjemce, předmět a HTML i text zprávy. Report obsahuje scénář a výsledky; zpráva s průvodcem obecnou PDF přílohu. Resend tak pro doručení zpracovává i obsah, metadata a stav zprávy.</p>
          <p>Veřejné zpracovatelské podmínky Resendu popisují zpracování e-mailových dat na pokyn zákazníka a oddělené vlastní účely pro účetní a provozní údaje. <strong>K doplnění / ověření:</strong> správce musí ověřit použitelné podmínky svého účtu, zpracovatelské ujednání a nastavení sledování otevření a kliknutí; jeho stav nelze zjistit z kódu.</p>
          <p className="privacy-sources"><a href="https://resend.com/legal/dpa">Zpracovatelské podmínky Resendu</a> · <a href="https://resend.com/legal/privacy-policy">Soukromí u Resendu</a></p>
        </article>
        <article>
          <h3>Cloudflare Turnstile — ochrana před roboty</h3>
          <p>Cloudflare získává z prohlížeče bezpečnostní signály, například IP adresu, údaje o prohlížeči a původu návštěvy. Server mu k ověření posílá token; kód do tohoto požadavku nevkládá váš e-mail ani investiční scénář.</p>
          <p>Podle dodatku Turnstile je Cloudflare při ochraně webu zpracovatelem signálů na pokyn provozovatele. Pro vlastní zlepšování detekce botů je samostatným správcem a uvádí vlastní oprávněný zájem. To nenahrazuje určení právního základu provozovatele ETF Kompasu. <strong>K doplnění / ověření:</strong> konkrétní nastavení widgetu a podmínky účtu.</p>
          <p className="privacy-sources"><a href="https://www.cloudflare.com/turnstile-privacy-policy/">Dodatek k soukromí Turnstile</a> · <a href="https://www.cloudflare.com/cloudflare-customer-dpa/">Zpracovatelské podmínky Cloudflare</a></p>
        </article>
        <article>
          <h3>Vercel — veřejný hosting</h3>
          <p>Aplikace podle potvrzení vlastníka běží na Vercel Hobby. Jeho infrastruktura obsluhuje web i serverové endpointy: projdou jí údaje formuláře a zpracovává také provozní a bezpečnostní údaje požadavků.</p>
          <p className="privacy-pending"><strong>K doplnění / ověření:</strong> regiony hostingu, logy a smluvní role. Veřejné DPA Vercelu vymezuje zpracování v roli zpracovatele pro Pro a Enterprise; nelze automaticky předpokládat jeho použitelnost pro Hobby. Správce musí vyřešit příslušné ujednání nebo zvolit odpovídající hostingové řešení.</p>
          <p className="privacy-sources"><a href="https://vercel.com/legal/dpa">Zpracovatelské podmínky Vercelu</a> · <a href="https://vercel.com/legal/privacy-notice">Soukromí u Vercelu</a></p>
        </article>
      </section>
      <section id="uchovavani" className="privacy-block" aria-labelledby="uchovavani-title">
        <h2 id="uchovavani-title">5. Kde a jak dlouho údaje zůstávají</h2>
        <p><strong>Aplikace nevede vlastní databázi kontaktů.</strong> Kód adresu používá při zpracování požadavku a nezapisuje ji, obsah formuláře ani odpovědi poskytovatelů do aplikačních logů či souborů. To neznamená, že údaje nejsou zpracovávány nebo uchovávány u poskytovatelů.</p>
        <p>Resend ve své veřejné dokumentaci uvádí standardní uchovávání e-mailových dat po dobu 30 dnů, včetně obsahu, metadat a událostí doručení. Jde o údaj poskytovatele, nikoli o ověřené nastavení tohoto účtu. <a href="https://resend.com/docs/knowledge-base/account-quotas-and-limits#data-retention">Dokumentace retence Resendu</a>.</p>
        <p className="privacy-pending"><strong>K doplnění / ověření:</strong> konkrétní retence účtu Resend, technických signálů Cloudflare a provozních záznamů hostingu, pravidla odstranění a vyřizování žádostí. Pro tyto oblasti nyní neuvádíme neověřenou jednotnou lhůtu. Kopie doručená do vaší schránky se uchovává také podle vašeho nastavení a pravidel vašeho poskytovatele e-mailu.</p>
      </section>
      <section id="prenosy" className="privacy-block" aria-labelledby="prenosy-title">
        <h2 id="prenosy-title">6. Případné přenosy mimo Evropský hospodářský prostor</h2>
        <p>Poskytovatelé využívají mezinárodní infrastrukturu a další dodavatele; zpracování nebo přístup mimo EHP proto nelze vyloučit. Z kódu nelze prokázat, že údaje zůstávají výhradně v EU.</p>
        <p className="privacy-pending"><strong>K doplnění / ověření:</strong> správce musí zjistit země a místa zpracování pro své účty, příjemce a další zpracovatele a použitý mechanismus případných přenosů — například použitelné rozhodnutí o odpovídající ochraně či standardní smluvní doložky a potřebná doplňující opatření. Veřejný seznam možných mechanismů není potvrzením, že konkrétní přenos má tyto záruky zajištěné.</p>
      </section>
      <section id="cookies" className="privacy-block" aria-labelledby="cookies-title">
        <h2 id="cookies-title">7. Cookies, analytika a automatické vyhodnocení</h2>
        <p>Vlastní kód aplikace nenastavuje sledovací cookies a neukládá kontakty do localStorage ani sessionStorage. Do localStorage ukládá pouze verzi preference, odmítnutí a jeho čas. Odmítnutí platí nejvýše 180 dní; při příštím čtení expirovaný záznam podle možností odstraníme. Povolení zůstává pouze v paměti otevřené stránky, včetně klientské navigace; po obnovení nebo novém načtení je potřeba nové potvrzení. Ani v jednom otevřeném dokumentu neplatí déle než 180 dní. Toto nezbytné nastavení slouží výhradně k respektování vaší volby, nikoli k identifikaci nebo profilování. Pokud úložiště nefunguje, odmítnutí nemusí přetrvat další načtení; měření se přesto nikdy samo nepovolí. Odvolání mezi kartami stejného webu předáváme přes události úložiště a dostupný BroadcastChannel, pouze zprávou o odmítnutí bez identifikátoru. Neobsahuje Google Analytics, reklamní pixely ani Vercel Analytics. Písma jsou obsluhována aplikací.</p>
        <p>Turnstile je bezpečnostní technologie, nikoli naše marketingová analytika. Jeho přesné chování závisí i na nastavení u Cloudflare; režim pre-clearance může používat bezpečnostní cookie. Tuto volbu ani případné technologie přidané hostingem nelze potvrdit pouhou kontrolou zdrojů.</p>
        <p className="privacy-pending"><strong>K doplnění / ověření:</strong> před zveřejněním této změny zkontrolovat skutečné síťové požadavky a úložiště na produkci, pre-clearance a e-mailový tracking. Produkční ověření není nahrazeno lokálními testy.</p>
        <p>Kalkulačka vytváří pouze modelové výsledky. Neprovádí úvěrové hodnocení ani jiné rozhodování s právními nebo obdobně významnými účinky. Turnstile automaticky vyhodnocuje bezpečnost požadavku a může odeslání odmítnout.</p>
      </section>
      <section id="analytika" className="privacy-block" aria-labelledby="analytics-title">
        <h2 id="analytics-title">8. Dobrovolná analytika Umami</h2>
        <p>Poskytovatelem je Umami Software, Inc. Analytický tracker se načte až po volbě „Povolit analytiku“, pouze v produkci. Bez volby a po odmítnutí neodesíláme Umami analytické události. Činnosti před souhlasem zpětně neposíláme. Nastavení najdete pod patičkou na každé stránce. Při odvolání se měření ihned zablokuje. Pokud se odmítnutí podaří uložit, stránka se obnoví a rozpracované neodeslané údaje se ztratí. Při chybě uložení zobrazíme upozornění a aktuální stránka zůstane bez měření. Již odeslané požadavky nelze odvoláním vzít zpět.</p>
        <p>Měříme vstup na landing page, dokončené změny parametrů bez jejich hodnot, zvolená ETF, zobrazení a první interakci s formulářem, pokusy, obecné chyby a potvrzené přijetí požadavku e-mailovou službou. Rozlišujeme report a průvodce. Přijetí není potvrzením doručení e-mailu. Předáváme jen povolené kampaně a reklamní varianty A/B, pevný název a cestu stránky a omezený referrer bez cesty a parametrů. E-maily, jejich hashe, investiční hodnoty, obsah formulářů, tokeny ani klíče do analytiky neposíláme.</p>
        <p>Tracker běží v prohlížeči, čte také technické údaje a preferenci umami.disabled z localStorage. Náš filtr neodesílá rozměry obrazovky ani jazyk v analytickém payloadu. Přesto síťová komunikace zpřístupňuje poskytovateli IP adresu a User-Agent. Umami zpracovává IP a User-Agent při tvorbě odvozeného identifikátoru návštěvy s rotující solí; IP podle dokumentace neukládá jako pole analytické session. Nejde o záruku úplné anonymity. Nepoužíváme vlastní návštěvnická ID, identify, heatmapy ani session replay.</p>
        <p>Podle potvrzení vlastníka je účet v EU datovém regionu. Tarif Hobby uchovává produkční analytická data šest měsíců. Záložní kopie podléhají samostatným cyklům poskytovatele. EU region neznamená, že veškeré zpracování zůstává v EU: CDN, bezpečnost, podpora a provozní logy mohou zahrnovat další země. Zpracovatelské podmínky Umami upravují i přenosy, včetně použití standardních smluvních doložek podle okolností.</p>
        <p>Souhlas můžete odmítnout nebo odvolat v „Nastavení analytiky“. Pro žádosti o práva a případné odstranění již zpracovaných údajů použijte kontakt správce; propojení konkrétní osoby s odvozenými záznamy nemusí být možné. Odvolání nemění zákonnost předchozího zpracování založeného na souhlasu.</p>
        <p className="privacy-sources"><a href="https://docs.umami.is/docs/metric-definitions">Jaké údaje Umami zpracovává</a> · <a href="https://docs.umami.is/docs/cloud/faq">Regiony a uchovávání</a> · <a href="https://umami.is/dpa">DPA</a> · <a href="https://umami.is/subprocessors">Další zpracovatelé</a></p>
      </section>
      <section id="vase-prava" className="privacy-block" aria-labelledby="prava-title">
        <h2 id="prava-title">9. Jaká máte práva</h2>
        <p>Za podmínek GDPR můžete požádat o přístup k údajům, jejich opravu, výmaz nebo omezení zpracování. Podle použitelného právního základu a dalších podmínek můžete mít právo na přenositelnost nebo vznést námitku. Pokud by se zpracování opíralo o souhlas, můžete jej odvolat; odvolání nemění zákonnost předchozího zpracování.</p>
        <p>{contact ? "Žádosti adresujte správci na veřejný kontaktní e-mail uvedený v první části." : "Veřejný kontakt pro žádosti musí správce doplnit před veřejným provozem."} Při žádosti sdělte jen údaje potřebné k dohledání požadavku; neposílejte hesla ani nepotřebné doklady. Neexistence vlastní databáze neznamená, že se žádostí nemusí správce zabývat i ve vztahu k poskytovatelům.</p>
        <p>Máte právo podat stížnost u <a href="https://uoou.gov.cz/">Úřadu pro ochranu osobních údajů</a>. Další informace: <a href="https://www.edpb.europa.eu/sme/be-compliant/respect-individuals-rights_en">práva podle GDPR — EDPB</a>.</p>
      </section>
    </main>
    <footer className="site-footer wrap"><Link href="/" className="brand">ETF<span>Kompas</span></Link><p>Osobní demo. Srozumitelné informace.</p><Link href="/#kalkulacka">Zpět ke kalkulačce</Link></footer>
  </>;
}
