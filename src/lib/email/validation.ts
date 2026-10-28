import { ETFS } from "../../data/etfs.ts";
import { compareInvestments } from "../investment.ts";

export type MaterialKind = "report" | "guide";
export interface ReportScenario {
  firstTicker: string;
  secondTicker: string;
  monthlyContribution: number;
  years: number;
  grossAnnualReturnPercent: number;
  initialInvestment: 0;
}
export interface MaterialRequest {
  requestId: string;
  email: string;
  website: string;
  turnstileToken: string;
  scenario?: ReportScenario;
}
export class InputError extends Error {}

export function validEmail(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 254 || /[\s\r\n<>]/.test(value)) return false;
  const parts = value.split("@");
  if (parts.length !== 2) return false;
  const [local, domain] = parts;
  return local.length > 0 && local.length <= 64 && !local.startsWith(".") && !local.endsWith(".") && !local.includes("..") &&
    /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(local) &&
    domain.length <= 253 && domain.includes(".") && domain.split(".").every((label) => /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/.test(label));
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new InputError();
  return value as Record<string, unknown>;
}
function exactKeys(value: Record<string, unknown>, keys: string[]) {
  if (Object.keys(value).some((key) => !keys.includes(key))) throw new InputError();
}

export function verifiedFund(ticker: unknown) {
  const fund = ETFS.find((item) => item.ticker === ticker);
  if (!fund || fund.verificationStatus !== "verified" || fund.annualExpenseRatioPercent === null) throw new InputError();
  return { ...fund, annualExpenseRatioPercent: fund.annualExpenseRatioPercent };
}

export function calculateReport(scenario: ReportScenario) {
  const first = verifiedFund(scenario.firstTicker);
  const second = verifiedFund(scenario.secondTicker);
  if (scenario.initialInvestment !== 0) throw new InputError();
  return {
    first, second,
    comparison: compareInvestments(scenario, [first.annualExpenseRatioPercent, second.annualExpenseRatioPercent]),
  };
}

export function validateMaterialRequest(kind: MaterialKind, raw: unknown): MaterialRequest {
  const body = object(raw);
  exactKeys(body, kind === "report" ? ["requestId", "email", "website", "turnstileToken", "scenario"] : ["requestId", "email", "website", "turnstileToken"]);
  if (typeof body.requestId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(body.requestId)) throw new InputError();
  if (typeof body.email !== "string") throw new InputError();
  const email = body.email.trim();
  if (!validEmail(email) || typeof body.website !== "string" || body.website.length !== 0 ||
    typeof body.turnstileToken !== "string" || !body.turnstileToken.trim() || body.turnstileToken.length > 2048) throw new InputError();
  const validated: MaterialRequest = { requestId: body.requestId, email, website: "", turnstileToken: body.turnstileToken };
  if (kind === "report") {
    const scenario = object(body.scenario);
    exactKeys(scenario, ["firstTicker", "secondTicker", "monthlyContribution", "years", "grossAnnualReturnPercent", "initialInvestment"]);
    if (typeof scenario.firstTicker !== "string" || typeof scenario.secondTicker !== "string" || scenario.initialInvestment !== 0 ||
      typeof scenario.monthlyContribution !== "number" || typeof scenario.years !== "number" || typeof scenario.grossAnnualReturnPercent !== "number") throw new InputError();
    validated.scenario = {
      firstTicker: scenario.firstTicker, secondTicker: scenario.secondTicker,
      monthlyContribution: scenario.monthlyContribution, years: scenario.years,
      grossAnnualReturnPercent: scenario.grossAnnualReturnPercent, initialInvestment: 0,
    };
    try { calculateReport(validated.scenario); } catch { throw new InputError(); }
  }
  return validated;
}
