export interface InvestmentInput {
  monthlyContribution: number;
  years: number;
  /** Percentage points: 7 means 7%, not 0.07. */
  grossAnnualReturnPercent: number;
  /** Percentage points: 0.03 means 0.03%, not 3%. */
  annualExpenseRatioPercent: number;
}

export interface AnnualInvestmentPoint {
  year: number;
  totalContributions: number;
  value: number;
}

export interface InvestmentResult {
  totalContributions: number;
  finalValue: number;
  annualProgress: AnnualInvestmentPoint[];
}

/** Application guardrails, not claims about possible market returns. */
export const INVESTMENT_LIMITS = {
  maxMonthlyContribution: 1_000_000_000,
  maxYears: 100,
  maxGrossAnnualReturnPercent: 100,
  maxResult: Number.MAX_SAFE_INTEGER,
} as const;

function validateInput(input: InvestmentInput): void {
  const fields = [
    "monthlyContribution",
    "years",
    "grossAnnualReturnPercent",
    "annualExpenseRatioPercent",
  ] as const;
  if (!input || fields.some((field) => !Number.isFinite(input[field]))) {
    throw new RangeError("All investment inputs must be finite numbers.");
  }
  if (
    input.monthlyContribution < 0 ||
    input.monthlyContribution > INVESTMENT_LIMITS.maxMonthlyContribution
  ) {
    throw new RangeError("Monthly contribution must be between 0 and 1,000,000,000.");
  }
  if (!Number.isInteger(input.years) || input.years < 0 || input.years > INVESTMENT_LIMITS.maxYears) {
    throw new RangeError("Years must be an integer between 0 and 100.");
  }
  if (input.grossAnnualReturnPercent <= -100 || input.grossAnnualReturnPercent > 100) {
    throw new RangeError("Gross annual return must be greater than -100% and at most 100%.");
  }
  if (input.annualExpenseRatioPercent < 0 || input.annualExpenseRatioPercent >= 100) {
    throw new RangeError("Annual expense ratio must be at least 0% and less than 100%.");
  }
}

/** Constant growth, end-of-month deposits; no tax, inflation or FX modelling. */
export function modelInvestment(input: InvestmentInput): InvestmentResult {
  validateInput(input);
  const { monthlyContribution, years, grossAnnualReturnPercent, annualExpenseRatioPercent } = input;
  const monthlyFactor = Math.exp(
    (Math.log1p(grossAnnualReturnPercent / 100) + Math.log1p(-annualExpenseRatioPercent / 100)) / 12,
  );
  let value = 0;
  const annualProgress: AnnualInvestmentPoint[] = [{ year: 0, totalContributions: 0, value: 0 }];

  for (let month = 1; month <= years * 12; month++) {
    value = value * monthlyFactor + monthlyContribution;
    if (!Number.isFinite(value) || value > INVESTMENT_LIMITS.maxResult) {
      throw new RangeError("Model value exceeds the supported numeric range.");
    }
    if (month % 12 === 0) {
      annualProgress.push({ year: month / 12, totalContributions: monthlyContribution * month, value });
    }
  }

  return { totalContributions: monthlyContribution * years * 12, finalValue: value, annualProgress };
}

/** Both funds necessarily share contribution, horizon and gross return. */
export function compareInvestments(
  input: Omit<InvestmentInput, "annualExpenseRatioPercent">,
  expenseRatiosPercent: readonly [number, number],
) {
  const first = modelInvestment({ ...input, annualExpenseRatioPercent: expenseRatiosPercent[0] });
  const second = modelInvestment({ ...input, annualExpenseRatioPercent: expenseRatiosPercent[1] });
  return { first, second, finalValueDifference: second.finalValue - first.finalValue };
}
