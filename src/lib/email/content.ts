import { calculateReport } from "./validation.ts";
import type { ReportScenario } from "./validation.ts";

export interface EmailContent { subject: string; html: string; text: string }
const money = (n: number) => new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK", maximumFractionDigits: 0 }).format(n);
const pct = (n: number) => `${new Intl.NumberFormat("cs-CZ", { maximumFractionDigits: 4 }).format(n)} %`;
export const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
const priipsUrl = "https://finance.ec.europa.eu/consumer-finance-and-payments/retail-financial-services/key-information-documents-packaged-retail-and-insurance-based-investment-products-priips_en";
const risk = "Vzdělávací materiál, nikoli individuální investiční doporučení. Výnos není zaručen; investice může ztratit hodnotu. Model nezahrnuje daně, inflaci, změny měnových kurzů, spread ani provize brokera.";
const availability = "Nákup amerických ETF může být českým a dalším evropským retailovým investorům omezen pravidly PRIIPs/KID. Americký prospekt ani factsheet nenahrazuje KID. Konkrétní dostupnost ověřte u brokera.";

export function emailLayout(title: string, body: string) {
  return `<!doctype html><html lang="cs"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(title)}</title></head><body style="margin:0;background:#f6f5ee;color:#173d35;font-family:Arial,sans-serif"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:20px 10px"><table role="presentation" width="620" cellpadding="0" cellspacing="0" style="width:100%;max-width:620px;background:#fffef9"><tr><td style="padding:28px 20px;background:#173d35;color:#fffef9"><p style="margin:0 0 16px;font-size:16px">ETF Kompas</p><h1 style="font-size:25px;line-height:1.25;margin:0">${escapeHtml(title)}</h1></td></tr><tr><td style="padding:24px 20px;font-size:15px;line-height:1.65">${body}<hr style="border:0;border-top:1px solid #d4dbce;margin-top:28px"><p style="font-size:12px;color:#54665e">Tento jednorázový e-mail jste si vyžádali na ETF Kompasu. Nejde o přihlášení k newsletteru ani ETF Hlídači.</p></td></tr></table></td></tr></table></body></html>`;
}

export function createReport(scenario: ReportScenario): EmailContent {
  const { first, second, comparison } = calculateReport(scenario);
  const difference = Math.abs(comparison.finalValueDifference);
  const differenceText = difference > 0 && difference < 1 ? "Méně než 1 Kč" : money(difference);
  const winner = comparison.finalValueDifference < 0 ? first : second;
  const context = (difference === 0 ? "Při těchto vstupech mají oba fondy stejnou modelovou hodnotu." : `${winner.ticker} má v tomto scénáři vyšší modelovou konečnou hodnotu. Rozdíl tvoří pouze nákladovost při stejném hrubém výnosu.`) + " Jde o rozdíl modelovaných konečných hodnot, nikoli o částku skutečně zaplacených poplatků.";
  const assumptions = `Počáteční investice: ${money(scenario.initialInvestment)}. Měsíční vklad: ${money(scenario.monthlyContribution)}. Horizont: ${scenario.years} let. Předpokládaný hrubý roční výnos: ${pct(scenario.grossAnnualReturnPercent)} pro oba fondy.`;
  const methodology = "Začínáme od nuly. Na konci každého měsíce přičteme vklad až po modelovém růstu. Měsíční faktor q = ((1 + g) × (1 − f))^(1/12), kde g je hrubý roční výnos a f nákladovost vyjádřené jako desetinná čísla. Výnos i nákladovost jsou konstantní, výnosy reinvestované, zlomkové podíly možné. Rozdíl zahrnuje složený růst, není součtem skutečně stržených poplatků. Zaokrouhlujeme jen zobrazení.";
  const sources = [first, second].map((fund) => `${fund.ticker}: ${fund.fullName}; ${fund.manager} (${fund.managerRole}); ${fund.index}; ${fund.exchange}; ${fund.expenseRatioLabel}: ${pct(fund.annualExpenseRatioPercent)} ročně. Ověřeno ${fund.verifiedOn}; datum podkladu ${fund.sourceAsOf ?? "neuvedeno"}. ${[fund.sourceUrl, ...fund.additionalSourceUrls].join(" ")}`);
  const rows = comparison.first.annualProgress.map((point, i) => ({year: point.year, deposits: money(point.totalContributions), first: money(point.value), second: money(comparison.second.annualProgress[i].value)}));
  const cell = (text: string) => `<td style="padding:9px 5px;border-bottom:1px solid #d4dbce;text-align:right;font-size:12px;overflow-wrap:anywhere;word-break:break-word">${escapeHtml(text).replace(/\u00a0/g, " ")}</td>`;
  const subject = `Váš model investice: ${first.ticker} a ${second.ticker} | ETF Kompas`;
  const html = emailLayout("Váš podrobný investiční scénář", `
    <p>${escapeHtml(assumptions)}</p>
    <div style="padding:20px;background:#d6ee89"><p style="margin:0">Modelovaný rozdíl v konečné hodnotě</p><p style="font-size:32px;font-weight:bold;margin:8px 0">${escapeHtml(differenceText)}</p><p style="margin:0;font-size:13px">${escapeHtml(context)}</p></div>
    <h2 style="font-size:19px">Základní výsledek</h2><p>Celkem vloženo: <strong>${escapeHtml(money(comparison.first.totalContributions))}</strong><br>${first.ticker}: <strong>${escapeHtml(money(comparison.first.finalValue))}</strong><br>${second.ticker}: <strong>${escapeHtml(money(comparison.second.finalValue))}</strong></p>
    <h2 style="font-size:19px">Roční přehled</h2><table width="100%" cellpadding="0" cellspacing="0" style="width:100%;table-layout:fixed;border-collapse:collapse"><caption style="text-align:left;font-size:12px">Konec roku; částky v Kč, zaokrouhleno</caption><thead><tr>${["Rok", "Vklady", first.ticker, second.ticker].map((label) => `<th scope="col" style="padding:8px 4px;background:#e5eadd;font-size:12px;text-align:right">${label}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${cell(String(row.year))}${cell(row.deposits)}${cell(row.first)}${cell(row.second)}</tr>`).join("")}</tbody></table>
    <h2 style="font-size:19px">Jak počítáme</h2><p>${escapeHtml(methodology)}</p><h2 style="font-size:19px">Ověřená data a zdroje</h2>${[first, second].map((fund) => `<p><strong>${fund.ticker}: ${escapeHtml(fund.fullName)}</strong><br>${escapeHtml(fund.manager)} (${escapeHtml(fund.managerRole)})<br>${escapeHtml(fund.index)} · ${escapeHtml(fund.exchange)}<br>${escapeHtml(fund.expenseRatioLabel)}: ${escapeHtml(pct(fund.annualExpenseRatioPercent))} ročně<br><small>Ověřeno ${fund.verifiedOn}; datum podkladu ${fund.sourceAsOf ?? "neuvedeno"}.</small><br>${[fund.sourceUrl, ...fund.additionalSourceUrls].map((url, i) => `<a style="color:#173d35" href="${escapeHtml(url)}">${i ? "Doplňující podklad" : "Primární zdroj emitenta"}</a>`).join(" · ")}</p>`).join("")}
    <h2 style="font-size:19px">Rizika a dostupnost</h2><p>${escapeHtml(risk)}</p><p>${escapeHtml(availability)} <a href="${priipsUrl}" style="color:#173d35">Vysvětlení Evropské komise</a>.</p>`);
  return {subject, html, text: [subject, assumptions, `Modelovaný rozdíl: ${differenceText}. ${context}`, `Celkem vloženo: ${money(comparison.first.totalContributions)}`, `${first.ticker}: ${money(comparison.first.finalValue)}`, `${second.ticker}: ${money(comparison.second.finalValue)}`, "Roční přehled (rok | vklady | první ETF | druhé ETF)", ...rows.map((row) => `${row.year} | ${row.deposits} | ${row.first} | ${row.second}`), methodology, ...sources, risk, availability, priipsUrl, "Jednorázové vyžádané zaslání. Bez přihlášení k newsletteru nebo ETF Hlídači."].join("\n\n")};
}

export function createGuideEmail(): EmailContent {
  const subject = "ETF od nuly: váš průvodce před první investicí";
  const text = `V příloze najdete český sedmistránkový průvodce „ETF od nuly: 7 věcí, které byste měli vědět před první investicí“. Vysvětluje fungování ETF, S&P 500, nákladovost, dividendy, rizika a evropská pravidla. Zpracováno 26. 10. 2026.\n\n${risk}\n\n${availability}\n\nJednorázové vyžádané zaslání. Bez přihlášení k newsletteru nebo ETF Hlídači.`;
  return {subject, text, html: emailLayout("ETF od nuly", `<p>V příloze najdete český <strong>sedmistránkový průvodce</strong> „ETF od nuly: 7 věcí, které byste měli vědět před první investicí“.</p><p>Fungování ETF, index S&amp;P 500, nákladovost, dividendy, rizika a evropská pravidla. S konkrétními ilustračními příklady a odkazy na zdroje.</p><p>Zpracováno 26. 10. 2026.</p><p>${escapeHtml(risk)}</p><p>${escapeHtml(availability)}</p>`)};
}
