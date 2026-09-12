import assert from "node:assert/strict";
import test from "node:test";

import { submitForm } from "../js/form-submit.js";

test("submits form data to the configured action as JSON-aware AJAX", async () => {
  const form = { action: "https://formsubmit.co/charlesbgroup@gmail.com" };
  const payload = { project: "Kitchen remodeling" };
  let request;

  const response = await submitForm(form, {
    createFormData: (target) => {
      assert.equal(target, form);
      return payload;
    },
    fetchImpl: async (url, options) => {
      request = { url, options };
      return { ok: true, status: 200 };
    },
  });

  assert.equal(response.status, 200);
  assert.equal(request.url, form.action);
  assert.equal(request.options.method, "POST");
  assert.equal(request.options.body, payload);
  assert.deepEqual(request.options.headers, { Accept: "application/json" });
});

test("rejects a non-successful FormSubmit response", async () => {
  await assert.rejects(
    submitForm(
      { action: "https://formsubmit.co/charlesbgroup@gmail.com" },
      {
        createFormData: () => ({}),
        fetchImpl: async () => ({ ok: false, status: 429 }),
      },
    ),
    /Form submission failed \(429\)/,
  );
});
