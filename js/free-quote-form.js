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
    delete formStatus.dataset.state;
    btnSubmit.focus();
  }

  function markQuoteSuccess() {
    // The provider's accepted response is the conversion signal. A synthetic
    // success URL can also match GA4 page-view rules and double-count the quote.
    window.history.replaceState({ quoteSubmitted: true }, "", window.location.pathname);
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
    const errorId = `${input.id}-error`;
    let errorElem = input.nextElementSibling;
    if (errorElem && errorElem.classList.contains("error-message")) {
      errorElem.textContent = message;
    } else {
      const span = document.createElement("span");
      span.id = errorId;
      span.className = "error-message";
      span.style.cssText = "color: #b91c1c; font-family: 'JetBrains Mono'; font-size: 0.75rem; margin-top: 4px; display: block; font-weight: bold;";
      span.textContent = `> ERR: ${message}`;
      input.insertAdjacentElement("afterend", span);
    }
    input.setAttribute("aria-invalid", "true");
    input.setAttribute("aria-describedby", errorId);
  }

  function clearErrors() {
    document.querySelectorAll(".error-message").forEach((elem) => elem.remove());
    form.querySelectorAll('[aria-invalid="true"]').forEach((input) => {
      input.removeAttribute("aria-invalid");
      input.removeAttribute("aria-describedby");
    });
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
      window.bentosTrack?.("estimate_form_error", { error_type: "validation" });
      errors.forEach(({ field, message }) => setError(document.getElementById(field), message));
      const firstInvalid = document.getElementById(errors[0].field);
      firstInvalid.focus();
      firstInvalid.scrollIntoView({ behavior: "smooth", block: "center" });
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
      const formData = new FormData(form);
      // FormSubmit uses _replyto for a verified customer reply address.
      // Never send an empty or unvalidated reply header.
      formData.delete('_replyto');
      if (data.email) formData.set('_replyto', data.email);
      await sendFormSubmit(form.action, formData);
      window.bentosTrackQuote?.(form);
      markQuoteSuccess();
      formStatus.textContent = "";
      delete formStatus.dataset.state;
      successModal.style.display = "flex";
      successModal.setAttribute("role", "dialog");
      successModal.setAttribute("aria-modal", "true");
      successModal.setAttribute("aria-labelledby", "success-title");
      document.getElementById("success-title").focus();
      form.reset();

    } catch (err) {
      window.bentosTrack?.("estimate_form_error", { error_type: "delivery" });
      console.error("Submission failed:", err);
      btnSubmit.disabled = false;
      btnSubmit.textContent = originalText;
      formStatus.dataset.state = "error";
      formStatus.textContent = err.cause === "timeout"
        ? "We could not confirm your request. Your entries remain on this page. Please use the call or text buttons below before resubmitting."
        : err.cause === "http"
        ? "We could not confirm your request. Your entries remain on this page. Please try again or use the call or text buttons below."
        : "We could not connect. Your entries remain on this page. Check your connection and try again, or use the call or text buttons below.";
      submissionGuard.finish();
    }
  });
});
