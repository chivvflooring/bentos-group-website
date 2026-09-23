import { createSubmissionGuard, sendFormSubmit } from "./form-submit.js";

document.addEventListener("DOMContentLoaded", function () {
  const backBtn = document.querySelector('.back-btn');
  const form = document.querySelector("#reformaForm");
  const btnSubmit = document.querySelector(".btn-submit");
  const successModal = document.querySelector("#successModal");
  const btnReset = document.querySelector('.btn-reset');
  const formStatus = document.querySelector('#formStatus');
  const submissionGuard = createSubmissionGuard();
  form.dataset.submitHandler = "module";

  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('success') === '1') {
    document.querySelector('.modal-success').style.display = 'flex';
  }

  const origin = window.location.origin;
  const path = window.location.pathname;
  const directory = path.substring(0, path.lastIndexOf('/'));
  document.getElementById('nextField').value = origin + directory + "/free-quote?success=1";

  function resetForm() {
    document.querySelector('.modal-success').style.display = 'none';
    const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
    window.history.replaceState({ path: cleanUrl }, '', cleanUrl);
    btnSubmit.disabled = false;
    btnSubmit.textContent = "Submit Request";
    submissionGuard.finish();
    formStatus.textContent = "";
    btnSubmit.focus();
  }

  function markQuoteSuccess() {
    const successUrl = `${window.location.origin}${window.location.pathname}?success=1`;
    window.history.pushState({ quoteSubmitted: true }, "", successUrl);
  }

  function handleBackNavigation(event) {
    const referrer = document.referrer;
    if (referrer && referrer.startsWith(window.location.origin)) {
      event.preventDefault();
      history.back();
    }
  }

  backBtn.addEventListener('click', handleBackNavigation);
  btnReset.addEventListener('click', resetForm);

  function setError(input, message) {
    if (!input) return;
    let errorElem = input.nextElementSibling;
    if (errorElem && errorElem.classList.contains("error-message")) {
      errorElem.textContent = message;
    } else {
      const span = document.createElement("span");
      span.className = "error-message";
      span.style.cssText = "color: #b91c1c; font-family: 'JetBrains Mono'; font-size: 0.75rem; margin-top: 4px; display: block; font-weight: bold;";
      span.textContent = `> ERR: ${message}`;
      input.insertAdjacentElement("afterend", span);
    }
  }

  function clearErrors() {
    document.querySelectorAll(".error-message").forEach((elem) => elem.remove());
  }

  function validateForm(data) {
    const errors = [];
    if (!data.name || data.name.length < 2) errors.push({ field: "client-name", message: "Name too short." });
    if ((data.email || document.getElementById("contact-preference").value === "Email") && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.push({ field: "client-email", message: "Invalid address." });
    if (!data.phone || data.phone.replace(/\D/g, "").length < 7) errors.push({ field: "client-phone", message: "Check phone number." });
    if (!data.location || data.location.length < 2) errors.push({ field: "location", message: "Required field." });
    return errors;
  }

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    clearErrors();
    if (form.elements._honey.value) return;

    const selectedServices = Array.from(form.querySelectorAll('input[name="Service"]:checked'))
      .map(cb => cb.parentElement.textContent.trim());

    const data = {
      name: document.getElementById("client-name").value.trim(),
      email: document.getElementById("client-email").value.trim(),
      phone: document.getElementById("client-phone").value.trim(),
      location: document.getElementById("location").value.trim(),
      areaSqFt: document.getElementById("floor-area").value,
      services: selectedServices,
      description: document.getElementById("notes").value.trim(),
      budget: document.getElementById("budget").value,
      timeline: document.getElementById("timeline").value,
      financingInterest: document.getElementById("financing-interest").value,
    };

    const errors = validateForm(data);
    if (errors.length > 0) {
      errors.forEach(({ field, message }) => setError(document.getElementById(field), message));
      document.querySelector(".error-message").scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    if (!submissionGuard.begin()) return;
    btnSubmit.disabled = true;
    const originalText = btnSubmit.textContent;
    btnSubmit.textContent = "Sending request…";

    try {
      formStatus.textContent = "Sending your request…";
      formStatus.dataset.state = "processing";
      window.bentosTrack?.("estimate_form_attempt");
      await sendFormSubmit(form.action, new FormData(form));
      window.bentosTrack?.("generate_lead");
      markQuoteSuccess();
      formStatus.textContent = "";
      successModal.style.display = "flex";
      successModal.setAttribute("role", "dialog");
      successModal.setAttribute("aria-modal", "true");
      successModal.setAttribute("aria-labelledby", "success-title");
      document.getElementById("success-title").focus();
      form.reset();

    } catch (err) {
      console.error("Submission failed:", err);
      btnSubmit.disabled = false;
      btnSubmit.textContent = originalText;
      formStatus.dataset.state = "error";
      formStatus.textContent = err.cause === "http"
        ? "We could not accept your request. Please try again or call (678) 571-7028."
        : "We could not connect. Check your connection and try again; your form entries are still here.";
      submissionGuard.finish();
    }
  });
});
