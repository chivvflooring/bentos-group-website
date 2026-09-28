import { createSubmissionGuard, sendFormSubmit } from './form-submit.js';

const topics = new Set(['new-construction', 'renovations', 'site-development', 'flooring', 'bathrooms', 'kitchens', 'home-care']);

document.querySelectorAll('[data-interest-signup]').forEach(form => {
  const guard = createSubmissionGuard();
  const status = form.querySelector('[role="status"]');
  const button = form.querySelector('button[type="submit"]');
  const source = form.querySelector('[name="Source page"]');
  source.value = location.pathname;

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (form.elements._honey?.value) return;
    if (!form.reportValidity() || !guard.begin()) return;
    const topic = form.querySelector('[name="Interest"]:checked')?.value;
    if (!topics.has(topic)) { guard.finish(); return; }
    button.disabled = true;
    status.textContent = 'Sending your request…';
    try {
      await sendFormSubmit(form.action, new FormData(form));
      form.reset();
      status.textContent = 'Thank you. We received your request to hear about ' + topic.replace('-', ' ') + '. You can unsubscribe from future emails at any time.';
      window.bentosTrack?.('interest_signup', { interest_topic: topic });
    } catch (_) {
      status.textContent = 'We could not save your request. Please try again, or email charlesbgroup@gmail.com.';
    } finally {
      button.disabled = false;
      guard.finish();
    }
  });
});
