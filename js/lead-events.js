// Lead events: send to the configured GA4 property on the production domain.
(function () {
  const allowed = new Set(['estimate_cta_click', 'estimate_form_attempt', 'generate_lead', 'phone_click', 'text_click']);
  window.bentosTrack = function (event) {
    if (!allowed.has(event)) return;
    const pathname = window.location.pathname;
    const page = /^\/[a-z0-9/_.-]*$/i.test(pathname) ? pathname : '/';
    window.dataLayer = window.dataLayer || [];
    // Never include names, contact details, project text, query strings or link destinations.
    window.dataLayer.push({ event, page_path: page });
    if (window.bentosAnalyticsReady && typeof window.gtag === 'function') {
      window.gtag('event', event, { send_to: 'G-XRBMTBNP58', page_path: page });
    }
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

  // Give every public content page a direct mobile path to call, text, or request an estimate.
  // Pages with a purpose-built action bar keep their existing, more specific version.
  function addMobileLeadActions() {
    if (document.querySelector('.mobile-lead-actions') || document.body?.dataset.disableLeadBar === 'true') return;

    const path = window.location.pathname.toLowerCase().replace(/\.html$/, '');
    if (/^\/(free-quote|404|admin)(\/|$)/.test(path)) return;
    const serviceRules = [
      [/roof/, 'roofing'],
      [/(custom-home|new-construction)/, 'new-construction'],
      [/home-addition/, 'home-addition'],
      [/kitchen/, 'kitchen'],
      [/bathroom/, 'bathroom'],
      [/floor/, 'flooring'],
      [/paint/, 'painting']
    ];
    const service = serviceRules.find(([pattern]) => pattern.test(path))?.[1] || '';
    const source = path.replace(/^\/+|\/+$/g, '').replace(/[^a-z0-9-]/g, '') || 'home';
    const quote = new URL('/free-quote', window.location.origin);
    if (service) quote.searchParams.set('service', service);
    quote.searchParams.set('source', source);

    const bar = document.createElement('nav');
    bar.className = 'mobile-lead-actions universal-lead-actions';
    bar.setAttribute('aria-label', 'Quick contact');
    bar.innerHTML = '<a href="tel:+16785717028">Call</a><a href="sms:+16785717028">Text</a><a class="mobile-estimate" href="' + quote.pathname + quote.search + '">Request Estimate</a>';
    document.body.appendChild(bar);

    if (!document.getElementById('universal-lead-actions-style')) {
      const style = document.createElement('style');
      style.id = 'universal-lead-actions-style';
      style.textContent = '@media(max-width:700px){body{padding-bottom:calc(4.25rem + env(safe-area-inset-bottom))}.universal-lead-actions{position:fixed;right:0;bottom:0;left:0;z-index:110;display:grid!important;grid-template-columns:.8fr .8fr 1.4fr;gap:1px;padding:.4rem max(.4rem,env(safe-area-inset-right)) calc(.4rem + env(safe-area-inset-bottom)) max(.4rem,env(safe-area-inset-left));background:#fff;box-shadow:0 -4px 18px rgb(0 0 0 / 18%)}.universal-lead-actions a{display:flex;min-height:48px;align-items:center;justify-content:center;padding:.65rem .4rem;border:2px solid #2c5531;background:#fff;color:#214126;font-size:.84rem;font-weight:700;line-height:1.1;text-align:center;text-decoration:none}.universal-lead-actions .mobile-estimate{background:#2c5531;color:#fff}}@media(min-width:701px){.universal-lead-actions{display:none}}';
      document.head.appendChild(style);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addMobileLeadActions, { once: true });
  else addMobileLeadActions();
})();
