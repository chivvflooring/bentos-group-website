import test from "node:test";
import assert from "node:assert/strict";
import { calculateMonthlyPayment, renderFinancingSummary } from "../js/financing-calculator.js";

test("calculates an amortized monthly payment", () => {
  assert.equal(calculateMonthlyPayment(10000, 9.99, 60).toFixed(2), "212.42");
});

test("supports a zero-percent illustrative rate", () => {
  assert.equal(calculateMonthlyPayment(12000, 0, 60), 200);
});

test("rejects invalid financing inputs", () => {
  assert.equal(calculateMonthlyPayment(-1, 9.99, 60), null);
  assert.equal(calculateMonthlyPayment(10000, 9.99, 0), null);
});

test("reusable summary shows total, calculated payment, terms, CTA, and disclosure", () => {
  const markup = renderFinancingSummary({ projectTotal: 10000, apr: 9.99, term: 60 });
  assert.match(markup, /Project Investment/);
  assert.match(markup, /\$10,000/);
  assert.match(markup, /Approximately \$212<small>\/month/);
  assert.match(markup, /60 months at 9\.99% illustrative APR/);
  assert.match(markup, /Check Financing Options/);
  assert.match(markup, /Bento’s Group is not a lender/);
});
