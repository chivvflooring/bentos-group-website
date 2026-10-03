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

export async function sendFormSubmit(action, formData, fetchImpl = fetch, timeoutMs = 15000) {
  combineRepeatedFormDataValues(formData);
  const controller = new AbortController();
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error("Request confirmation timed out", { cause: "timeout" }));
      controller.abort();
    }, timeoutMs);
  });
  try {
    return await Promise.race([timeout, (async () => {
      const response = await fetchImpl(formSubmitAjaxUrl(action), {
        method: "POST", body: formData, signal: controller.signal,
        headers: { Accept: "application/json" }
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`, { cause: "http" });
      let result;
      try { result = await response.json(); }
      catch { throw new Error("Unconfirmed form response", { cause: "http" }); }
      if (result.success !== true && result.success !== "true") {
        throw new Error("Form service did not accept request", { cause: "http" });
      }
      return response;
    })()]);
  } finally {
    clearTimeout(timer);
  }
}
