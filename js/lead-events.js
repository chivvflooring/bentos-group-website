// Local event hooks only. No analytics vendor, cookies or network requests are installed here.
(function () {
  const allowed = new Set(['estimate_cta_click', 'estimate_form_attempt', 'generate_lead', 'phone_click', 'text_click']);
  window.bentosTrack = function (event) {
    if (!allowed.has(event)) return;
    const pathname = window.location.pathname;
    const page = /^\/[a-z0-9/_.-]*$/i.test(pathname) ? pathname : '/';
    window.dataLayer = window.dataLayer || [];
    // Never include names, contact details, project text, query strings or link destinations.
    window.dataLayer.push({ event, page_path: page });
  };
  document.addEventListener('click', function (event) {
    const link = event.target.closest?.('a[href]');
    if (!link) return;
    const href = link.getAttribute('href');
    if (href.startsWith('tel:')) window.bentosTrack('phone_click');
    else if (href.startsWith('sms:')) window.bentosTrack('text_click');
    else {
      try {
        const url = new URL(href, window.location.href);
        if (url.origin === window.location.origin && /^\/free-quote(?:\.html)?\/?$/.test(url.pathname)) {
          window.bentosTrack('estimate_cta_click');
        }
      } catch (_) { /* Invalid links must not interfere with navigation. */ }
    }
  });
})();
