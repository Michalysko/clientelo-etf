import { Calculator } from "@/components/calculator";
import Link from "next/link";
import { EmailForm } from "@/components/email-form";
import { TurnstileProvider } from "@/components/turnstile-provider";
import { ETFS } from "@/data/etfs";
import { publicDeliveryConfig } from "@/lib/email/config";

const date = (value: string) => new Intl.DateTimeFormat("cs-CZ", { timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));

export default function Home() {
  const delivery = publicDeliveryConfig();
  return (
    <TurnstileProvider enabled={delivery.enabled}>
      <a className="skip-link" href="#obsah">Přejít na obsah</a>
      <header className="site-header wrap">
        <a href="#" className="brand" aria-label="ETF Kompas — úvod">
          <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="14" fill="none" stroke="currentColor" /><path d="m21 9-3 10-8 4 3-10z" fill="currentColor" /><circle cx="16" cy="16" r="2" fill="var(--paper)" /></svg>
          ETF<span>Kompas</span>
        </a>
        <nav aria-label="Hlavní navigace">
          <a href="#kalkulacka">Porovnat ETF <span aria-hidden="true">↗</span></a>
          <a className="desktop-link" href="#pruvodce">Pro začátečníky</a>
          <a className="desktop-link" href="#zdroje">Zdroje</a>
        </nav>
      </header>
      <main id="obsah">
        <section className="hero wrap" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow"><span className="signal" /> MÉNĚ DOHADŮ. VÍCE PŘEHLEDU.</p>
            <h1 id="hero-title">Stejný index.<br />Jiné poplatky.<br /><em>Jaký je rozdíl?</em></h1>
            <p className="hero-description">Porovnejte ETF na S&amp;P 500. Výsledek hned. Podrobný report k výpočtu i průvodce ETF pro začátečníky zdarma na e-mail.</p>
            <nav className="hero-materials" aria-label="Materiály zdarma na e-mail">
              <a className="hero-report-link" href="#report-na-email">Získat report zdarma <span aria-hidden="true">↓</span></a>
              <a className="hero-guide-link" href="#pruvodce-na-email">Průvodce zdarma <span aria-hidden="true">↓</span></a>
            </nav>
            <div className="editorial-note"><span className="note-index">01 / PRINCIP</span><p>Výnos trhu neznáme.<br /><strong>Nákladovost porovnat můžeme.</strong></p><p className="small muted">Obě ETF počítáme se stejným hrubým výnosem. Rozdíl v modelu tak tvoří pouze nákladovost.</p></div>
            <ul className="hero-benefits" aria-label="Výhody ETF Kompasu">
              <li><span className="benefit-mark" aria-hidden="true">↗</span><div><h2>Skutečná data</h2><p>Poplatky ETF vycházejí z oficiálních zdrojů správců fondů.</p></div></li>
              <li><span className="benefit-mark" aria-hidden="true">↗</span><div><h2>Váš konkrétní scénář</h2><p>Okamžitě uvidíte modelovaný dopad rozdílných nákladů na hodnotu investice.</p></div></li>
              <li><span className="benefit-mark" aria-hidden="true">↗</span><div><h2>Podrobný report e-mailem</h2><p>Získáte roční přehled vývoje investice a porovnání obou ETF zdarma.</p></div></li>
            </ul>
          </div>
          <div className="calculator-column">
            <Calculator delivery={delivery} />
            <p className="hero-risk small">Modelový výpočet, nikoli investiční doporučení. Výnos není zaručen. Dostupnost amerických ETF pro český retail omezuje PRIIPs/KID. <a href="#dostupnost">Co to znamená?</a></p>
          </div>
        </section>
        <section className="fund-section wrap" id="zdroje" aria-labelledby="fund-title">
          <div className="section-heading"><div><p className="eyebrow">02 / CO VLASTNĚ POROVNÁVÁTE</p><h2 id="fund-title">Čtyři cesty ke stejnému indexu.</h2></div><p>Skutečné údaje od emitentů.<br />Ověřeno {Array.from(new Set(ETFS.map((fund) => fund.verifiedOn))).map(date).join(", ")}, nejde o živá data.</p></div>
          <div className="fund-grid">
            {ETFS.map((fund) => (
              <article className="fund-card" key={fund.ticker} aria-labelledby={`fund-${fund.ticker}`}>
                <div className="fund-card-top"><h3 id={`fund-${fund.ticker}`}>{fund.ticker}</h3><span className="fund-exchange">{fund.exchange}</span></div>
                <p className="fund-name">{fund.fullName}</p>
                <p className="fund-fee">{fund.verificationStatus === "verified" && fund.annualExpenseRatioPercent !== null ? `${new Intl.NumberFormat("cs-CZ", { maximumFractionDigits: 4 }).format(fund.annualExpenseRatioPercent)} %` : "Neověřeno"}<span>ročně · {fund.expenseRatioLabel}</span></p>
                <dl className="fund-facts"><dt>Zaměření</dt><dd>{fund.index} · velké americké společnosti</dd><dt>Správce / role</dt><dd>{fund.manager}<span>{fund.managerRole}</span></dd></dl>
                {fund.previousTicker && <p className="small muted">Dříve {fund.previousTicker.ticker}. Změna tickeru {date(fund.previousTicker.changedOn)}.</p>}
                <a className="source-link" href={fund.sourceUrl} target="_blank" rel="noopener noreferrer">Údaje u emitenta <span aria-hidden="true">↗</span><span className="sr-only"> — {fund.ticker}, otevře nové okno</span></a>
                <details className="fund-provenance"><summary>Podrobnosti o zdroji</summary><p className="small">Datum podkladu: {fund.sourceAsOf ? date(fund.sourceAsOf) : "přesné datum sazby neuvedeno"}. Ověřeno {date(fund.verifiedOn)}.</p>{fund.additionalSourceUrls.map((url, index) => <a key={url} href={url} target="_blank" rel="noopener noreferrer">Doplňující zdroj {index + 1}<span className="sr-only"> — {fund.ticker}, otevře nové okno</span> ↗</a>)}</details>
              </article>
            ))}
          </div>
        </section>
        <section className="guide-section" id="pruvodce" aria-labelledby="guide-title">
          <div className="wrap guide-grid">
            <div><p className="eyebrow">03 / PRVNÍ KROK NEMUSÍ BÝT VELKÝ</p><h2 id="guide-title">V investování se<br />teprve <em>rozkoukáváte?</em></h2><p>Získejte zdarma sedmistránkový PDF průvodce „ETF od nuly: 7 věcí, které byste měli vědět před první investicí“. Co je index, jak číst nákladovost a na co se ptát před první investicí.</p><ul className="guide-topics"><li>ETF bez finančního žargonu</li><li>Poplatky v souvislostech</li><li>Americké ETF a evropská pravidla</li></ul></div>
            <div className="guide-offer" id="pruvodce-na-email" tabIndex={-1}><span className="note-index">PRŮVODCE ETF / ZDARMA</span><h3>Nejdřív pochopit.<br />Potom se rozhodnout.</h3><EmailForm id="guide" buttonText="Chci průvodce zdarma" kind="guide" delivery={delivery} /></div>
          </div>
        </section>
        <section className="disclosures wrap" id="dostupnost" aria-labelledby="disclosures-title">
          <p className="eyebrow">04 / DOBRÉ VĚDĚT PŘEDEM</p><h2 id="disclosures-title">Čísla potřebují kontext.</h2>
          <div className="disclosure-grid">
            <article><h3>Model, nikoli předpověď</h3><p>Počítáme s konstantním hrubým výnosem a vkladem na konci každého měsíce. Výnosy se reinvestují. Skutečný vývoj kolísá a investice může ztratit hodnotu. Model nezahrnuje daně, inflaci, změny měnových kurzů, provize ani spread.</p></article>
            <article><h3>Americká ETF a PRIIPs/KID</h3><p>Český retailový investor nemusí mít možnost tato americká ETF koupit. Pro retailovou distribuci je potřeba dokument KID; bez něj bývá nákup u evropských brokerů blokován. Factsheet ani americký prospekt jej nenahrazují. Dostupnost ověřte u svého brokera.</p><a href="https://finance.ec.europa.eu/consumer-finance-and-payments/retail-financial-services/key-information-documents-packaged-retail-and-insurance-based-investment-products-priips_en" target="_blank" rel="noopener noreferrer">Pravidla PRIIPs podle Evropské komise ↗<span className="sr-only">, otevře nové okno</span></a><a href="https://www.lynxbroker.com/service/products-and-regulations/regulations/key-information-document/" target="_blank" rel="noopener noreferrer">Praktické vysvětlení KID od LYNX ↗<span className="sr-only">, otevře nové okno</span></a></article>
          </div>
        </section>
        <section className="privacy-section wrap" id="osobni-udaje" aria-labelledby="privacy-title">
          <h2 id="privacy-title">Jednorázový materiál. Žádný automatický odběr.</h2>
          <p>Zadaný e-mail a u reportu parametry scénáře zpracujeme pro zaslání vyžádaného materiálu. Zprávu a přílohu předáme službě Resend, která pro doručení zpracovává příjemce i obsah e-mailu. V aplikaci nevytváříme databázi kontaktů ani je nezapisujeme do aplikačních logů.</p>
          <p>Formuláře chrání Cloudflare Turnstile, které při ověření zpracovává technické údaje prohlížeče. Zadáním e-mailu se nepřihlašujete k newsletteru ani ETF Hlídači. <a href="https://www.cloudflare.com/privacypolicy/" target="_blank" rel="noopener noreferrer">Soukromí u Cloudflare ↗</a> · <a href="https://resend.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer">Soukromí u Resend ↗</a></p>
          <p><strong>ETF Kompas je osobní nekomerční demo pro výběrové řízení Clientelo.</strong> Správce a skutečný rozsah zpracování jsou popsány na samostatné stránce; neověřené položky jsou označeny k doplnění před veřejným spuštěním. <Link href="/ochrana-osobnich-udaju">Ochrana osobních údajů</Link>.</p>
        </section>
      </main>
      <footer className="site-footer wrap"><a className="brand" href="#">ETF<span>Kompas</span></a><p>V číslech jasno. V rozhodnutí vlastní směr.</p><span>Vzdělávací projekt · Bez investičního poradenství</span><Link href="/ochrana-osobnich-udaju">Ochrana osobních údajů</Link></footer>
    </TurnstileProvider>
  );
}
