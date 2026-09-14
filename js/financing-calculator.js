const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

/**
 * Calculate a fixed monthly payment using the standard amortization formula.
 * APR is expressed as a percentage (for example, 9.99), and term is in months.
 */
export function calculateMonthlyPayment(principal, annualPercentageRate, termMonths) {
  const amount = Number(principal);
  const months = Number(termMonths);
  const apr = Number(annualPercentageRate);

  if (!Number.isFinite(amount) || amount <= 0 || !Number.isFinite(months) || months <= 0 || !Number.isFinite(apr) || apr < 0) {
    return null;
  }

  const monthlyRate = apr / 100 / 12;
  if (monthlyRate === 0) return amount / months;

  return amount * monthlyRate * (1 + monthlyRate) ** months / ((1 + monthlyRate) ** months - 1);
}

export function formatProjectCurrency(value) {
  return currency.format(value);
}

export function renderFinancingSummary({
  projectTotal,
  apr = 9.99,
  term = 60,
  ctaHref = "./free-quote.html?financing=interested",
} = {}) {
  const payment = calculateMonthlyPayment(projectTotal, apr, term);
  if (payment === null) return "";

  return `
    <div class="financing-summary" data-financing-summary>
      <div class="financing-summary__price">
        <span>Project Investment</span>
        <strong>${formatProjectCurrency(projectTotal)}</strong>
      </div>
      <div class="financing-summary__divider" aria-hidden="true">or</div>
      <div class="financing-summary__payment">
        <span>Estimated Financing</span>
        <strong>Approximately ${formatProjectCurrency(payment)}<small>/month*</small></strong>
        <span class="financing-summary__terms">${term} months at ${Number(apr).toFixed(2)}% illustrative APR</span>
      </div>
      <a class="financing-cta" href="${ctaHref}">Check Financing Options</a>
      <p class="financing-disclosure">*Illustrative estimate only. Actual APR, term, eligibility, approval, loan amount, and monthly payment are determined by participating lenders. Bento’s Group is not a lender.</p>
    </div>`;
}

function updateCalculator(calculator) {
  const amountInput = calculator.querySelector("[data-financing-amount]");
  const aprInput = calculator.querySelector("[data-financing-apr]");
  const projectTotal = Number(amountInput?.value);
  const apr = Number(aprInput?.value);

  calculator.querySelector("[data-project-total]").textContent = projectTotal > 0
    ? formatProjectCurrency(projectTotal)
    : "—";

  calculator.querySelectorAll("[data-financing-term]").forEach((output) => {
    const payment = calculateMonthlyPayment(projectTotal, apr, output.dataset.financingTerm);
    output.textContent = payment === null ? "—" : `${formatProjectCurrency(payment)}/month*`;
  });

  const aprLabels = calculator.querySelectorAll("[data-selected-apr]");
  aprLabels.forEach((label) => { label.textContent = Number.isFinite(apr) ? apr.toFixed(2) : "—"; });
}

export function initializeFinancingCalculators(root = document) {
  root.querySelectorAll("[data-financing-calculator]").forEach((calculator) => {
    const refresh = () => updateCalculator(calculator);
    calculator.addEventListener("input", refresh);
    calculator.addEventListener("change", refresh);
    refresh();
  });
}

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => initializeFinancingCalculators());
}
