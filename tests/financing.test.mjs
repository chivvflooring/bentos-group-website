import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { calculatePrincipalOnlyEstimates, FINANCING_TERMS, formatCurrency } from "../js/financing.js";

test("calculator returns all required term estimates", () => {
  assert.deepEqual(FINANCING_TERMS, [36, 60, 84, 120]);
  assert.deepEqual(calculatePrincipalOnlyEstimates(25200), {
    36: 700,
    60: 420,
    84: 300,
    120: 210
  });
});

test("calculator handles invalid and negative investments safely", () => {
  assert.deepEqual(calculatePrincipalOnlyEstimates("not a number"), { 36: 0, 60: 0, 84: 0, 120: 0 });
  assert.deepEqual(calculatePrincipalOnlyEstimates(-1000), { 36: 0, 60: 0, 84: 0, 120: 0 });
});

test("currency values are consistently displayed with cents", () => {
  assert.equal(formatCurrency(500), "$500.00");
  assert.equal(formatCurrency(1000 / 36), "$27.78");
});

test("official Acorn referral URL is preserved on both calls to action", async () => {
  const page = await readFile(new URL("../financing.html", import.meta.url), "utf8");
  const referralUrl = "https://www.acornfinance.com/pre-qualify/?d=VSZXA&utm_medium=web_pre_qual_banner";
  const normalizedPage = page.replaceAll("&amp;", "&");
  assert.equal(normalizedPage.split(referralUrl).length - 1, 2);
  assert.match(page, /id="acornBanner"/);
  assert.match(page, /acorn-finance-banner-easy-payment-options-horizontal-small\.png/);
});

test("page discloses estimate limitations and lender relationship", async () => {
  const page = await readFile(new URL("../financing.html", import.meta.url), "utf8");
  assert.match(page, /Illustrative estimates only/);
  assert.match(page, /not a lender/);
  assert.match(page, /do not include interest, lender fees/);
  assert.match(page, /Social Security numbers, income, credit, banking/);
});
