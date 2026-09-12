document.addEventListener("DOMContentLoaded", function () {
  const backBtn = document.querySelector('.back-btn');
  const form = document.querySelector("#reformaForm");
  const btnSubmit = document.querySelector(".btn-submit");
  const successModal = document.querySelector("#successModal");
  const btnReset = document.querySelector('.btn-reset');

  // 1. Pega os parâmetros da URL atual
  const urlParams = new URLSearchParams(window.location.search);

  // 2. Verifica se o parâmetro "success" existe e qual o valor dele
  if (urlParams.get('success') === '1') {
    document.querySelector('.modal-success').style.display = 'flex';
  }

  const origin = window.location.origin; // https://...cloudworkstations.dev
  const path = window.location.pathname; // /bentos-group-website/free-quote.html

  // Remove o nome do arquivo atual e adiciona o novo
  const directory = path.substring(0, path.lastIndexOf('/'));

  document.getElementById('nextField').value = origin + directory + "/free-quote?success=1";

  function resetForm() {
    // 1. Esconde o modal visualmente
    document.querySelector('.modal-success').style.display = 'none';

    // 2. Limpa a URL (remove o ?success=1) sem recarregar a página
    const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
    window.history.replaceState({ path: cleanUrl }, '', cleanUrl);

    // 3. Opcional: Se quiser limpar os campos do formulário caso eles ainda existam
    // document.getElementById('seu-formulario-id').reset();

    btnSubmit.disabled = false;
    btnSubmit.textContent = "Submit Request";
  }

  function handleBackNavigation(event) {
    const referrer = document.referrer;

    // Verifica se o referrer existe e pertence ao mesmo domínio
    if (referrer && referrer.startsWith(window.location.origin)) {
      // Impede que o navegador siga o link href="/"
      event.preventDefault();
      history.back();
    }

    // Se não entrar no IF, o navegador seguirá naturalmente para o href="/"
  }

  backBtn.addEventListener('click', handleBackNavigation);
  btnReset.addEventListener('click', resetForm);

  // --- UTILS ---

  function setError(input, message) {
    if (!input) return;
    let errorElem = input.nextElementSibling;
    if (errorElem && errorElem.classList.contains("error-message")) {
      errorElem.textContent = message;
    } else {
      const span = document.createElement("span");
      span.className = "error-message";
      // Estilo técnico combinando com o Blueprint
      span.style.cssText = "color: #b91c1c; font-family: 'JetBrains Mono'; font-size: 0.75rem; margin-top: 4px; display: block; font-weight: bold;";
      span.textContent = `> ERR: ${message}`;
      input.insertAdjacentElement("afterend", span);
    }
  }

  function clearErrors() {
    document.querySelectorAll(".error-message").forEach((elem) => elem.remove());
  }

  function formatKey(key) {
    return key.replace(/([A-Z])/g, " $1").replace(/\b\w/g, (c) => c.toUpperCase()).trim();
  }

  function dataToText(data) {
    return Object.entries(data)
      .map(([key, value]) => {
        const val = Array.isArray(value) ? value.join(", ") : value;
        return `${formatKey(key)}: ${val || "N/A"}`;
      })
      .join("\n");
  }

  // --- VALIDATION ---

  function validateForm(data) {
    const errors = [];
    if (!data.name || data.name.length < 2) errors.push({ field: "client-name", message: "Name too short." });
    if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.push({ field: "client-email", message: "Invalid address." });
    if (!data.phone || data.phone.length < 7) errors.push({ field: "client-phone", message: "Check phone number." });
    if (!data.location || data.location.length < 2) errors.push({ field: "location", message: "Required field." });
    return errors;
  }

  // --- MAIN HANDLER ---

  form.addEventListener("submit", async function (event) {
    event.preventDefault(); // Impede o redirecionamento para o FormSubmit
    clearErrors();

    // Coleta os serviços marcados
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
    };

    const errors = validateForm(data);
    if (errors.length > 0) {
      errors.forEach(({ field, message }) => setError(document.getElementById(field), message));
      // Scroll suave até o primeiro erro
      document.querySelector(".error-message").scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    // Feedback Visual
    btnSubmit.disabled = true;
    const originalText = btnSubmit.textContent;
    btnSubmit.textContent = "UPLOADING DATA...";

    try {
      const formData = new FormData(form);
      const response = await fetch(form.action, {
        method: "POST",
        body: formData,
        headers: { 'Accept': 'application/json' }
      });

      if (!response.ok) throw new Error(`Form submission failed (${response.status})`);
      successModal.style.display = "flex";
      form.reset();

    } catch (err) {
      console.error("Transmission Failure:", err);
      btnSubmit.disabled = false;
      btnSubmit.textContent = originalText;
      alert("CRITICAL ERROR: Connection issue. Please check your internet or try again.");
    }
  });
});