export const FINANCING_TERMS = [36, 60, 84, 120];

export function calculatePrincipalOnlyEstimates(investment) {
  const amount = Number(investment);
  const safeAmount = Number.isFinite(amount) && amount >= 0 ? amount : 0;

  return Object.fromEntries(
    FINANCING_TERMS.map((term) => [term, safeAmount / term])
  );
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

export function updateFinancingEstimates(input, outputElements) {
  const estimates = calculatePrincipalOnlyEstimates(input.value);
  outputElements.forEach((element) => {
    element.textContent = formatCurrency(estimates[element.dataset.term]);
  });
}

if (typeof document !== "undefined") {
  const investmentInput = document.getElementById("project-investment");
  const estimateOutputs = document.querySelectorAll("[data-term]");

  if (investmentInput && estimateOutputs.length) {
    investmentInput.addEventListener("input", () => {
      updateFinancingEstimates(investmentInput, estimateOutputs);
    });
  }
}
