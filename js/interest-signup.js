import { createSubmissionGuard } from './form-submit.js';

export const INTEREST_TOPICS = new Set(['new-construction', 'renovations', 'site-development', 'flooring', 'bathrooms', 'kitchens', 'painting', 'decks', 'home-care']);

export async function sendInterestSignup(payload, fetchImpl = fetch) {
  const controller = new AbortController();
  let timer;
  try {
    return await Promise.race([
      (async () => {
        const response = await fetchImpl('/.netlify/functions/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal
        });
        let result;
        try { result = await response.json(); }
        catch { throw new Error('Signup confirmation was not received.'); }
        if (!response.ok || result?.ok !== true) {
          const error = new Error(result?.error || 'Signup request was not confirmed.');
          error.status = response.status;
          throw error;
        }
        return result;
      })(),
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error('Signup confirmation timed out.'));
          controller.abort();
        }, 15000);
      })
    ]);
  } finally {
    clearTimeout(timer);
  }
}

document.querySelectorAll('[data-interest-signup]').forEach(form => {
  const guard = createSubmissionGuard();
  const status = form.querySelector('[role="status"]');
  const button = form.querySelector('button[type="submit"]');
  const startedAt = Date.now();
  const showMissingFields = () => {
    status.textContent = 'Please enter a valid email address, choose one topic, and check the consent box to receive project ideas. For an estimate, use the separate project request form.';
  };
  form.addEventListener('invalid', showMissingFields, true);

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!form.reportValidity() || !guard.begin()) return;
    const topic = form.querySelector('[name="interest"]:checked')?.value;
    if (!INTEREST_TOPICS.has(topic)) { guard.finish(); return; }

    const payload = {
      email: form.elements.email.value.trim(),
      interest: topic,
      consent: form.elements.consent.checked,
      consentVersion: form.elements.consent_version.value,
      source: location.pathname,
      website: form.elements.website.value,
      startedAt
    };

    button.disabled = true;
    status.textContent = 'Saving your signup…';
    try {
      await sendInterestSignup(payload);
      form.reset();
      status.textContent = 'Thank you. Your email signup was saved. You can unsubscribe from every email.';
      window.bentosTrack?.('interest_signup', { interest_topic: topic });
    } catch (error) {
      status.textContent = error.status === 429
        ? 'Please wait a moment before trying again.'
        : 'We could not save your signup. Your entries are still here; please try again later. For a project request, use Request an Estimate or call us.';
      const estimate = document.createElement('a');
      estimate.href = '/free-quote';
      estimate.textContent = 'Request an estimate';
      const call = document.createElement('a');
      call.href = 'tel:+16785717028';
      call.textContent = 'Call (678) 571-7028';
      status.append(' ', estimate, ' or ', call, '.');
    } finally {
      button.disabled = false;
      guard.finish();
    }
  });
});
