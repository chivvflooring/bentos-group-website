export function createSubmissionGuard() {
  let processing = false;
  return {
    begin() {
      if (processing) return false;
      processing = true;
      return true;
    },
    finish() { processing = false; },
    isProcessing() { return processing; }
  };
}

export function formSubmitAjaxUrl(action) {
  const url = new URL(action);
  if (url.hostname === "formsubmit.co" && !url.pathname.startsWith("/ajax/")) {
    url.pathname = `/ajax${url.pathname}`;
  }
  return url.toString();
}

export async function sendFormSubmit(action, formData, fetchImpl = fetch) {
  const response = await fetchImpl(formSubmitAjaxUrl(action), {
    method: "POST",
    body: formData,
    headers: { Accept: "application/json" }
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`, { cause: "http" });
  }
  // FormSubmit may return JSON, HTML, or text. HTTP success is authoritative.
  return response;
}
