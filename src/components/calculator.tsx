"use client";

import { useRef, useState } from "react";
import { analytics, trackAnalytics } from "@/lib/analytics";
import { ETFS } from "@/data/etfs";
import { compareInvestments, INVESTMENT_LIMITS } from "@/lib/investment";
import { EmailForm } from "./email-form";
import type { DeliveryUiConfig } from "./email-form";

const money = (value: number) => new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK", maximumFractionDigits: 0 }).format(value);
const percent = (value: number) => new Intl.NumberFormat("cs-CZ", { maximumFractionDigits: 4 }).format(value);
const parse = (value: string) => /^-?\d+(?:[.,]\d+)?$/.test(value.trim()) ? Number(value.trim().replace(",", ".")) : NaN;

export function Calculator({ delivery }: { delivery: DeliveryUiConfig }) {
  const [firstTicker, setFirstTicker] = useState("SPY");
  const [secondTicker, setSecondTicker] = useState("SPYM");
  const [amount, setAmount] = useState("5000");
  const [years, setYears] = useState("20");
  const [grossReturn, setGrossReturn] = useState("7");
  type Field = "monthly_contribution" | "years" | "gross_return";
  const edits = useRef<Partial<Record<Field, { baseline: number; epoch: number | undefined }>>>({});
  function markEdit(field: Field, before: string) {
    edits.current[field] = { baseline: edits.current[field]?.baseline ?? parse(before), epoch: analytics.currentEpoch() };
  }
  function commitEdit(field: Field, value: string, error: string) {
    const edit = edits.current[field]; delete edits.current[field];
    if (edit && edit.epoch !== undefined && edit.epoch === analytics.currentEpoch() && !error && Number.isFinite(parse(value)) && edit.baseline !== parse(value)) trackAnalytics({ name: "calculator_change", field });
  }
  const monthlyContribution = parse(amount);
  const horizon = parse(years);
  const grossAnnualReturnPercent = parse(grossReturn);
  const first = ETFS.find((fund) => fund.ticker === firstTicker)!;
  const second = ETFS.find((fund) => fund.ticker === secondTicker)!;
  const amountError = !Number.isFinite(monthlyContribution) || monthlyContribution < 0 || monthlyContribution > INVESTMENT_LIMITS.maxMonthlyContribution ? "Zadejte částku od 0 do 1 000 000 000 Kč." : "";
  const yearsError = !Number.isInteger(horizon) || horizon < 0 || horizon > INVESTMENT_LIMITS.maxYears ? "Zadejte celý počet let od 0 do 100." : "";
  const returnError = !Number.isFinite(grossAnnualReturnPercent) || grossAnnualReturnPercent <= -100 || grossAnnualReturnPercent > INVESTMENT_LIMITS.maxGrossAnnualReturnPercent ? "Zadejte výnos vyšší než −100 % a nejvýše 100 %." : "";
  let result: ReturnType<typeof compareInvestments> | null = null;
  let modelError = "";
  if (!amountError && !yearsError && !returnError) {
    if (first.verificationStatus !== "verified" || second.verificationStatus !== "verified" || first.annualExpenseRatioPercent === null || second.annualExpenseRatioPercent === null) {
      modelError = "Nákladovost vybraného fondu není ověřená. Zvolte jiný fond.";
    } else {
      try { result = compareInvestments({ monthlyContribution, years: horizon, grossAnnualReturnPercent }, [first.annualExpenseRatioPercent, second.annualExpenseRatioPercent]); }
      catch { modelError = "Tato kombinace přesahuje číselný limit modelu. Snižte vklad, horizont nebo výnos."; }
    }
  }
  const difference = result ? Math.abs(result.finalValueDifference) : 0;
  const winner = result && result.finalValueDifference < 0 ? first : second;
  const maxValue = result ? Math.max(result.first.finalValue, result.second.finalValue, result.first.totalContributions, 1) : 1;
  const chartPath = (which: "first" | "second") => result?.[which].annualProgress.map((point, index) => `${index ? "L" : "M"}${30 + (horizon ? point.year / horizon : 0) * 480},${160 - point.value / maxValue * 140}`).join(" ");

  return (
    <section className="calculator" id="kalkulacka" aria-labelledby="calculator-title">
      <div className="calculator-results" aria-labelledby="results-title">
        <div className="result-heading"><h3 id="results-title">Vliv poplatků v číslech</h3><span>MODELOVÝ VÝSLEDEK</span></div>
        {result ? <>
          <div className="difference-box">
            <div><span>Modelovaný rozdíl v konečné hodnotě</span><strong>{difference > 0 && difference < 1 ? "Méně než 1 Kč" : money(difference)}</strong></div>
            <p className="model-assumptions">{money(monthlyContribution)} měsíčně · {percent(horizon)} let · předpokládaný hrubý výnos {percent(grossAnnualReturnPercent)} % ročně</p>
            <p>{difference === 0 ? "Při těchto vstupech je modelový výsledek stejný." : `${winner.ticker} má v tomto scénáři vyšší konečnou hodnotu.`} Rozdíl tvoří pouze nákladovost při stejném hrubém výnosu. Nejde o částku skutečně zaplacených poplatků.</p>
          </div>
          <p className="contributions">Celkem vložíte <strong>{money(result.first.totalContributions)}</strong></p>
          <div className="value-grid"><div><span className="value-label"><i className="chart-key first-key" />{first.ticker}</span><p>{money(result.first.finalValue)}</p></div><div><span className="value-label"><i className="chart-key second-key" />{second.ticker}</span><p>{money(result.second.finalValue)}</p></div></div>
          <p className="sr-only" role="status">Model: vloženo {money(result.first.totalContributions)}. {first.ticker}: {money(result.first.finalValue)}. {second.ticker}: {money(result.second.finalValue)}. Rozdíl {money(difference)}.</p>
          <details className="trajectory"><summary>Jak se investice vyvíjí v čase <span aria-hidden="true">+</span></summary><svg viewBox="0 0 540 190" role="img" aria-labelledby="chart-title chart-desc"><title id="chart-title">Modelový průběh investice</title><desc id="chart-desc">Plná čára značí {second.ticker}, tečkovaná {first.ticker} a přerušovaná součet vkladů. Blízké výsledky se mohou překrývat. Přesné hodnoty jsou v tabulce níže.</desc><path d="M30 20V160H510" className="chart-axis" /><path d={`M30 160L${horizon ? 510 : 30} ${160 - result.first.totalContributions / maxValue * 140}`} className="deposits-line" /><path d={chartPath("second")} className="second-line" /><path d={chartPath("first")} className="first-line" /><text x="30" y="183">0 let</text><text x="510" y="183" textAnchor="end">{horizon} let</text></svg><div className="chart-legend"><span><i className="chart-key first-key" />{first.ticker} · tečkovaně</span><span><i className="chart-key second-key" />{second.ticker} · plně</span><span>– – Vklady</span></div><div className="annual-table" tabIndex={0} role="region" aria-label="Roční hodnoty — posuvná tabulka"><table><caption>Hodnoty na konci roku · Kč, zaokrouhleno</caption><thead><tr><th scope="col">Rok</th><th scope="col">Vklady</th><th scope="col">{first.ticker}</th><th scope="col">{second.ticker}</th></tr></thead><tbody>{result.first.annualProgress.map((point, index) => <tr key={point.year}><th scope="row">{point.year}</th><td>{money(point.totalContributions)}</td><td>{money(point.value)}</td><td>{money(result!.second.annualProgress[index].value)}</td></tr>)}</tbody></table></div></details>
        </> : <p className="calculation-error" role="status">{modelError || "Doplňte platné hodnoty v nastavení níže. Výsledek se přepočítá automaticky."}</p>}
        <p className="result-disclaimer">Modelový výpočet, nikoli investiční doporučení. Výnos není zaručen. Vklady na konci měsíce. Bez daní, inflace, kurzových změn a nákladů brokera. <a href="#metodika">Jak počítáme?</a> <a href="#dostupnost">Dostupnost ETF a PRIIPs/KID</a>.</p>
      </div>
      <div className="calculator-inputs">
        <div className="calculator-heading"><h2 id="calculator-title">Vaše investice. Váš scénář.</h2><span className="model-badge">INTERAKTIVNÍ MODEL</span></div>
        <div className="input-grid">
          <div className="input-field amount-field"><label htmlFor="monthly-amount">Měsíčně investuji</label><div className={`number-control ${amountError ? "invalid" : ""}`}><input id="monthly-amount" type="text" inputMode="decimal" value={amount} onChange={(event) => { markEdit("monthly_contribution", amount); setAmount(event.target.value); }} onBlur={() => commitEdit("monthly_contribution", amount, amountError)} aria-invalid={!!amountError} aria-describedby={amountError ? "amount-error" : undefined} /><span>Kč</span></div>{amountError && <p className="field-error" id="amount-error">{amountError}</p>}</div>
          <div className="input-field"><label htmlFor="investment-years">Po dobu</label><div className={`number-control ${yearsError ? "invalid" : ""}`}><input id="investment-years" type="text" inputMode="numeric" value={years} onChange={(event) => { markEdit("years", years); setYears(event.target.value); }} onBlur={() => commitEdit("years", years, yearsError)} aria-invalid={!!yearsError} aria-describedby={yearsError ? "years-error" : undefined} /><span>let</span></div>{yearsError && <p className="field-error" id="years-error">{yearsError}</p>}</div>
          <div className="input-field"><label htmlFor="gross-return">Hrubý roční výnos</label><div className={`number-control ${returnError ? "invalid" : ""}`}><input id="gross-return" type="text" inputMode="decimal" value={grossReturn} onChange={(event) => { markEdit("gross_return", grossReturn); setGrossReturn(event.target.value); }} onBlur={() => commitEdit("gross_return", grossReturn, returnError)} aria-invalid={!!returnError} aria-describedby={`return-hint${returnError ? " return-error" : ""}`} /><span>%</span></div>{returnError && <p className="field-error" id="return-error">{returnError}</p>}</div>
        </div>
        <p id="return-hint" className="input-hint">Výnos je váš předpoklad, nikoli prognóza. Pro oba fondy platí stejný.</p>
        <div className="fund-pickers">
          {[{ fund: first, value: firstTicker, set: setFirstTicker, id: "first-fund", label: "První ETF" }, { fund: second, value: secondTicker, set: setSecondTicker, id: "second-fund", label: "Druhé ETF" }].map(({ fund, value, set, id, label }) => (
            <div className="fund-picker" key={id}><label htmlFor={id}>{label}</label><select id={id} value={value} onChange={(event) => { const ticker = event.target.value; if (ticker !== value && ["SPY", "SPYM", "VOO", "IVV"].includes(ticker)) trackAnalytics({ name: "etf_change", position: id === "first-fund" ? "first" : "second", ticker: ticker as "SPY" | "SPYM" | "VOO" | "IVV" }); set(ticker); }}>{ETFS.map((option) => <option key={option.ticker} value={option.ticker} disabled={option.verificationStatus !== "verified" || option.annualExpenseRatioPercent === null}>{option.ticker}</option>)}</select><div className="picker-fee">{fund.annualExpenseRatioPercent !== null && fund.verificationStatus === "verified" ? `${percent(fund.annualExpenseRatioPercent)} %` : "Neověřeno"}<span>nákladovost ročně</span></div><a href={`#fund-${fund.ticker}`} className="small">Správce, zaměření a zdroj ↗</a></div>
          ))}
        </div>
      </div>
      <div className="report-offer" id="report-na-email" tabIndex={-1}><p className="eyebrow">VÁŠ SCÉNÁŘ PODROBNĚ</p><p className="report-description">Report v e-mailu obsahuje roční přehled investice, porovnání nákladovosti obou ETF a předpoklady vašeho výpočtu.</p><EmailForm id="report" buttonText="Zaslat podrobný výpis na e-mail" kind="report" delivery={delivery} scenario={result ? {firstTicker, secondTicker, monthlyContribution, years: horizon, grossAnnualReturnPercent, initialInvestment: 0} : null} /></div>
      <details className="methodology" id="metodika"><summary>Metodika a limity výpočtu</summary><p>Měsíční růstový faktor je ((1 + g) × (1 − f))<sup>1/12</sup>, kde g je předpokládaný hrubý roční výnos a f roční nákladovost, obojí převedené z procent na desetinné číslo. Zůstatek nejprve zhodnotíme a poté přičteme měsíční vklad. Nákladovost je zjednodušeně rozložena do celého roku.</p><p>Počítáme od nuly, s konstantním výnosem, reinvestováním a možností zlomkových podílů. Rozdíl zahrnuje i vliv složeného růstu, není součtem skutečně stržených poplatků. Částky zaokrouhlujeme pouze pro zobrazení.</p><p>Model přijímá celé roky 0–{INVESTMENT_LIMITS.maxYears}, vklad do {money(INVESTMENT_LIMITS.maxMonthlyContribution)} a hrubý výnos nad −100 % až do {INVESTMENT_LIMITS.maxGrossAnnualReturnPercent} %. Extrémní výsledky odmítne. Jde o technické limity, nikoli předpoklady trhu.</p></details>
    </section>
  );
}
