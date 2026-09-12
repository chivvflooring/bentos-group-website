import test from "node:test";
import assert from "node:assert/strict";
import { createSubmissionGuard, formSubmitAjaxUrl, sendFormSubmit } from "../js/form-submit.js";
import { selectedCategoryValues, validatePunchList } from "../js/homecare-form.js";

test("successful HTTP response is accepted without parsing its body", async () => {
  let requestedUrl;
  const response = await sendFormSubmit("https://formsubmit.co/example@example.com", {}, async (url) => {
    requestedUrl = url;
    return { ok: true, status: 200, text: () => { throw new Error("must not parse"); } };
  });
  assert.equal(response.status, 200);
  assert.equal(requestedUrl, "https://formsubmit.co/ajax/example@example.com");
});

test("network failure remains a network failure", async () => {
  await assert.rejects(sendFormSubmit("https://formsubmit.co/example@example.com", {}, async () => {
    throw new TypeError("Network error");
  }), TypeError);
});

test("unsuccessful HTTP response is rejected", async () => {
  await assert.rejects(sendFormSubmit("https://formsubmit.co/example@example.com", {}, async () => ({ ok: false, status: 500 })), /HTTP 500/);
});

test("submission guard prevents double submission and recovers", () => {
  const guard = createSubmissionGuard();
  assert.equal(guard.begin(), true);
  assert.equal(guard.begin(), false);
  guard.finish();
  assert.equal(guard.begin(), true);
});

test("punch list accepts several categories in one valid request", () => {
  const data = { name: "Jane Doe", email: "jane@example.com", phone: "6785551212", location: "30004", timing: "Within 1 month", details: "Repair drywall and adjust a door.", categories: ["Drywall", "Door"], interest: "One-Time Punch List" };
  assert.deepEqual(validatePunchList(data), []);
});

test("punch list requires a category and contact details", () => {
  const data = { name: "", email: "bad", phone: "12", location: "", timing: "", details: "", categories: [], interest: "" };
  assert.deepEqual(validatePunchList(data), ["name", "email", "phone", "location", "timing", "details", "categories", "interest"]);
});

test("selected categories preserve every checked choice", () => {
  const inputs = [{ value: "Drywall" }, { value: "Flooring" }, { value: "Other" }];
  const form = { querySelectorAll: selector => selector.includes(":checked") ? inputs : [] };
  assert.deepEqual(selectedCategoryValues(form), ["Drywall", "Flooring", "Other"]);
});
