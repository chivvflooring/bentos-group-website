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

export function combineRepeatedFormDataValues(formData) {
  if (!formData || typeof formData.keys !== "function" || typeof formData.getAll !== "function") {
    return formData;
  }

  const fieldNames = new Set(formData.keys());

  for (const fieldName of fieldNames) {
    const values = formData.getAll(fieldName);
    if (values.length > 1 && values.every((value) => typeof value === "string")) {
      formData.set(fieldName, values.join("\n"));
    }
  }

  return formData;
}

export async function sendFormSubmit(action, formData, fetchImpl = fetch) {
  combineRepeatedFormDataValues(formData);
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
