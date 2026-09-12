import { createSubmissionGuard, sendFormSubmit } from "./form-submit.js";

export function validatePunchList({ name, email, phone, location, timing, details, categories, interest }) {
  const errors = [];
  if (name.trim().length < 2) errors.push("name");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errors.push("email");
  if (phone.replace(/\D/g, "").length < 7) errors.push("phone");
  if (location.trim().length < 3) errors.push("location");
  if (!timing) errors.push("timing");
  if (details.trim().length < 5) errors.push("details");
  if (categories.length === 0) errors.push("categories");
  if (!interest) errors.push("interest");
  return errors;
}

export function selectedCategoryValues(form) {
  return Array.from(form.querySelectorAll('input[name="Service Categories"]:checked'), input => input.value);
}

function initializePunchListForm() {
  const form = document.querySelector("#punch-list-form");
  if (!form) return;

  const submitButton = form.querySelector(".submit-button");
  const status = document.querySelector("#form-status");
  const categoryError = document.querySelector("#category-error");
  const successPanel = document.querySelector("#success-panel");
  const newListButton = document.querySelector("#new-list-button");
  const guard = createSubmissionGuard();
  document.querySelector("#next-field").value = `${window.location.origin}${window.location.pathname}?success=1`;

  const fieldMap = {
    name: "#homeowner-name", email: "#homeowner-email", phone: "#homeowner-phone",
    location: "#property-location", timing: "#preferred-timing", details: "#punch-list-details"
  };

  form.addEventListener("submit", async event => {
    event.preventDefault();
    categoryError.textContent = "";
    form.querySelectorAll(".invalid").forEach(element => element.classList.remove("invalid"));

    const categories = selectedCategoryValues(form);
    const data = {
      name: form.querySelector(fieldMap.name).value,
      email: form.querySelector(fieldMap.email).value,
      phone: form.querySelector(fieldMap.phone).value,
      location: form.querySelector(fieldMap.location).value,
      timing: form.querySelector(fieldMap.timing).value,
      details: form.querySelector(fieldMap.details).value,
      categories,
      interest: form.querySelector('input[name="Service Interest"]:checked')?.value || ""
    };
    const errors = validatePunchList(data);
    if (errors.length) {
      errors.forEach(key => {
        if (fieldMap[key]) form.querySelector(fieldMap[key]).classList.add("invalid");
      });
      if (errors.includes("categories")) {
        categoryError.textContent = "Select at least one maintenance or repair category.";
        document.querySelector("#service-categories").classList.add("invalid");
      }
      if (errors.includes("interest")) form.querySelector(".choice-grid").classList.add("invalid");
      status.dataset.state = "error";
      status.textContent = "Please complete the required fields before submitting.";
      form.querySelector(".invalid")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    if (!guard.begin()) return;
    const originalText = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = "Sending…";
    status.dataset.state = "processing";
    status.textContent = "Sending your complete punch list…";
    try {
      await sendFormSubmit(form.action, new FormData(form));
      form.reset();
      status.textContent = "";
      successPanel.hidden = false;
      newListButton.focus();
    } catch (error) {
      submitButton.disabled = false;
      submitButton.textContent = originalText;
      status.dataset.state = "error";
      status.textContent = error.cause === "http"
        ? "We could not accept your request. Please try again or call (678) 571-7028."
        : "We could not connect. Check your connection and try again; your entries are still here.";
      guard.finish();
    }
  });

  newListButton.addEventListener("click", () => {
    successPanel.hidden = true;
    submitButton.disabled = false;
    submitButton.textContent = "Submit My Punch List";
    guard.finish();
    form.querySelector("#homeowner-name").focus();
  });
}

if (typeof document !== "undefined") document.addEventListener("DOMContentLoaded", initializePunchListForm);
