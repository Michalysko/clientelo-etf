import assert from "node:assert/strict";
import { test } from "node:test";
import { compareInvestments, modelInvestment } from "../src/lib/investment.ts";
import type { InvestmentInput } from "../src/lib/investment.ts";

const base: InvestmentInput = {
  monthlyContribution: 1000,
  years: 20,
  grossAnnualReturnPercent: 7,
  annualExpenseRatioPercent: 0.03,
};

function close(actual: number, expected: number, tolerance = 1e-10) {
  assert.ok(Math.abs(actual - expected) <= tolerance * Math.max(1, Math.abs(expected)), `${actual} != ${expected}`);
}

test("zero return and zero fees equal deposits at every year", () => {
  const result = modelInvestment({ ...base, grossAnnualReturnPercent: 0, annualExpenseRatioPercent: 0 });
  assert.equal(result.finalValue, 240_000);
  assert.equal(result.totalContributions, 240_000);
  assert.equal(result.annualProgress.length, 21);
  for (const point of result.annualProgress) {
    assert.equal(point.value, point.year * 12_000);
    assert.equal(point.totalContributions, point.value);
  }
});

test("zero gross return with positive fees reduces final value", () => {
  const result = modelInvestment({ ...base, grossAnnualReturnPercent: 0 });
  assert.ok(result.finalValue < result.totalContributions);
  assert.ok(result.finalValue > 0);
});

test("zero fees and known 1% monthly growth agree with independent annuity", () => {
  const grossAnnualReturnPercent = ((1.01 ** 12) - 1) * 100;
  const result = modelInvestment({ ...base, years: 1, grossAnnualReturnPercent, annualExpenseRatioPercent: 0 });
  close(result.finalValue, 1000 * (1.01 ** 12 - 1) / 0.01);
});

test("identical funds produce identical trajectories", () => {
  const result = compareInvestments(base, [0.03, 0.03]);
  assert.deepEqual(result.first, result.second);
  assert.equal(result.finalValueDifference, 0);
});

test("comparison shares gross return and isolates cost difference", () => {
  const result = compareInvestments(base, [0.0945, 0.02]);
  assert.equal(result.first.totalContributions, result.second.totalContributions);
  assert.ok(result.finalValueDifference > 0);
  assert.deepEqual(result.first, modelInvestment({ ...base, annualExpenseRatioPercent: 0.0945 }));
  assert.deepEqual(result.second, modelInvestment({ ...base, annualExpenseRatioPercent: 0.02 }));
});

test("zero contribution stays zero even at maximum return and horizon", () => {
  const result = modelInvestment({ ...base, monthlyContribution: 0, years: 100, grossAnnualReturnPercent: 100 });
  assert.equal(result.finalValue, 0);
  assert.ok(result.annualProgress.every((point) => point.value === 0 && point.totalContributions === 0));
});

test("zero horizon includes only the initial point", () => {
  assert.deepEqual(modelInvestment({ ...base, years: 0 }), {
    finalValue: 0, totalContributions: 0,
    annualProgress: [{ year: 0, value: 0, totalContributions: 0 }],
  });
});

// Independent closed-form geometric sum; production uses monthly recurrence.
for (const years of [1, 5, 30, 100]) {
  for (const grossAnnualReturnPercent of [-20, 0, 7]) {
    test(`independent annuity and annual points: ${years} years, ${grossAnnualReturnPercent}%`, () => {
      const fee = 0.03;
      const result = modelInvestment({ ...base, years, grossAnnualReturnPercent, annualExpenseRatioPercent: fee });
      const q = ((1 + grossAnnualReturnPercent / 100) * (1 - fee / 100)) ** (1 / 12);
      for (const point of result.annualProgress) {
        const expected = base.monthlyContribution * (q ** (point.year * 12) - 1) / (q - 1);
        close(point.value, expected);
        assert.equal(point.totalContributions, base.monthlyContribution * point.year * 12);
      }
      assert.equal(result.annualProgress.at(-1)?.value, result.finalValue);
      assert.equal(result.totalContributions, base.monthlyContribution * years * 12);
    });
  }
}

test("very small rates remain close to deposits", () => {
  close(modelInvestment({ ...base, grossAnnualReturnPercent: 1e-12, annualExpenseRatioPercent: 0 }).finalValue, 240_000);
});

test("near-total losses and near-100% expenses remain finite and nonnegative", () => {
  const result = modelInvestment({ ...base, grossAnnualReturnPercent: -99.999, annualExpenseRatioPercent: 99.999 });
  assert.ok(Number.isFinite(result.finalValue));
  assert.ok(result.finalValue >= base.monthlyContribution);
  assert.ok(result.finalValue < result.totalContributions);
});

test("percent units are correct and no money rounding is applied", () => {
  const result = modelInvestment({ ...base, monthlyContribution: 123.45, years: 1 });
  const q = (1.07 * 0.9997) ** (1 / 12);
  close(result.finalValue, 123.45 * (q ** 12 - 1) / (q - 1));
  assert.notEqual(result.finalValue, Math.round(result.finalValue * 100) / 100);
});

test("inputs are not mutated and calls are deterministic", () => {
  const input = Object.freeze({ ...base });
  assert.deepEqual(modelInvestment(input), modelInvestment(input));
  assert.deepEqual(input, base);
});

test("all fields reject nonfinite values and runtime strings", () => {
  for (const field of Object.keys(base)) {
    for (const invalid of [NaN, Infinity, -Infinity, "7", undefined]) {
      assert.throws(() => modelInvestment({ ...base, [field]: invalid } as unknown as InvestmentInput), RangeError);
    }
  }
  assert.throws(() => modelInvestment(null as unknown as InvestmentInput), RangeError);
});

test("invalid domains and extreme horizons are rejected", () => {
  const invalidInputs = [
    { monthlyContribution: -1 }, { monthlyContribution: 1_000_000_001 },
    { years: -1 }, { years: 0.5 }, { years: 101 },
    { grossAnnualReturnPercent: -100 }, { grossAnnualReturnPercent: -101 }, { grossAnnualReturnPercent: 101 },
    { annualExpenseRatioPercent: -0.01 }, { annualExpenseRatioPercent: 100 },
  ];
  for (const invalid of invalidInputs) assert.throws(() => modelInvestment({ ...base, ...invalid }), RangeError);
});

test("maximum deposit at zero growth is accepted; excessive result throws", () => {
  const result = modelInvestment({ ...base, monthlyContribution: 1e9, years: 100, grossAnnualReturnPercent: 0, annualExpenseRatioPercent: 0 });
  assert.equal(result.finalValue, 1.2e12);
  assert.throws(() => modelInvestment({ ...base, monthlyContribution: 1e9, years: 100, grossAnnualReturnPercent: 100 }), RangeError);
});
