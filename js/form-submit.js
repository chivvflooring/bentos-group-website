/**
 * Submit an HTML form to FormSubmit without navigating away from the page.
 * Keeping this small adapter separate makes the network behavior testable.
 */
export async function submitForm(form, options = {}) {
  if (!form?.action) {
    throw new TypeError("A form with an action URL is required.");
  }

  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const createFormData = options.createFormData ?? ((target) => new FormData(target));

  if (typeof fetchImpl !== "function") {
    throw new TypeError("A fetch implementation is required.");
  }

  const response = await fetchImpl(form.action, {
    method: "POST",
    body: createFormData(form),
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Form submission failed (${response.status})`);
  }

  return response;
}
