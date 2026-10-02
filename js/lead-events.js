// Lead events: send to the configured GA4 property on the production domain.
(function () {
  const allowed = new Set(['estimate_cta_click', 'estimate_form_attempt', 'estimate_form_start', 'estimate_form_error', 'generate_lead', 'phone_click', 'text_click', 'interest_signup', 'project_video_play']);
  const topics = new Set(['new-construction', 'renovations', 'site-development', 'flooring', 'bathrooms', 'kitchens', 'home-care']);
  const leadCategories = new Set(['new-construction', 'site-development', 'renovations', 'kitchens', 'bathrooms', 'flooring', 'other']);
  window.bentosTrack = function (event, details = {}) {
    if (!allowed.has(event)) return;
    const pathname = window.location.pathname;
    const page = /^\/[a-z0-9/_.-]*$/i.test(pathname) ? pathname : '/';
    window.dataLayer = window.dataLayer || [];
    // Never include names, contact details, project text, query strings or link destinations.
    const params = { page_path: page };
    if (topics.has(details.interest_topic)) params.interest_topic = details.interest_topic;
    if (event === 'generate_lead' && leadCategories.has(details.lead_category)) params.lead_category = details.lead_category;
    if (event === 'estimate_form_error' && ['validation', 'delivery'].includes(details.error_type)) params.error_type = details.error_type;
    window.dataLayer.push({ event, ...params });
    if (window.bentosAnalyticsReady && typeof window.gtag === 'function') {
      window.gtag('event', event, { send_to: 'G-XRBMTBNP58', ...params });
      // The Ads conversion imports this GA4 event. The quote form uses AJAX and
      // history.pushState, so its success URL does not trigger a page-load event.
      if (event === 'generate_lead') {
        window.gtag('event', 'ads_conversion_Request_quote_1', {
          send_to: 'G-XRBMTBNP58', page_path: page
        });
      }
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
  document.addEventListener('play', function (event) {
    if (event.target?.matches?.('video[data-video-topic]')) {
      window.bentosTrack('project_video_play', { interest_topic: event.target.dataset.videoTopic });
    }
  }, true);

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

  // Offer an easy next step without blocking content or collecting personal data.
  // The estimate page handles contact details, consent and provider validation.
  function addProjectPlanner() {
    if (document.querySelector('.project-planner') || document.body?.dataset.disableLeadBar === 'true') return;
    const path = window.location.pathname.toLowerCase().replace(/\.html$/, '');
    if (/^\/(free-quote|404|admin)(\/|$)/.test(path)) return;

    const planner = document.createElement('aside');
    planner.className = 'project-planner';
    planner.setAttribute('aria-label', 'Project planning help');
    planner.innerHTML = '<button class="project-planner__toggle" type="button" aria-expanded="false" aria-controls="project-planner-panel"><span aria-hidden="true">✦</span> Plan your project</button>' +
      '<div class="project-planner__panel" id="project-planner-panel" hidden>' +
      '<button class="project-planner__close" type="button" aria-label="Close project planner">×</button>' +
      '<p class="project-planner__eyebrow">Not sure where to start?</p>' +
      '<strong>Tell us what you are planning.</strong>' +
      '<p>Share your project details when you are ready. Browsing the site does not add you to a marketing list.</p>' +
      '<a href="/free-quote?source=project-planner">Start my project request</a>' +
      '<small>Prefer a conversation? <a href="tel:+16785717028">Call Bento’s Group</a></small>' +
      '</div>';
    document.body.appendChild(planner);

    const toggle = planner.querySelector('.project-planner__toggle');
    const panel = planner.querySelector('.project-planner__panel');
    const close = planner.querySelector('.project-planner__close');
    function setOpen(open) {
      panel.hidden = !open;
      toggle.setAttribute('aria-expanded', String(open));
      if (open) close.focus();
      else toggle.focus();
    }
    toggle.addEventListener('click', () => setOpen(panel.hidden));
    close.addEventListener('click', () => setOpen(false));
    planner.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !panel.hidden) setOpen(false);
    });

    if (!document.getElementById('project-planner-style')) {
      const style = document.createElement('style');
      style.id = 'project-planner-style';
      style.textContent = '.project-planner{position:fixed;right:1.25rem;bottom:1.25rem;z-index:105;font-family:Arial,sans-serif}.project-planner__toggle{display:flex;gap:.55rem;align-items:center;padding:.85rem 1.1rem;border:0;border-radius:999px;background:#2c5531;color:#fff;box-shadow:0 6px 24px rgb(0 0 0 / 24%);font-weight:700;cursor:pointer}.project-planner__toggle span{color:#e8c86b}.project-planner__panel{position:absolute;right:0;bottom:calc(100% + .75rem);width:min(22rem,calc(100vw - 2rem));padding:1.35rem;border:1px solid #d8dfd4;border-radius:1rem;background:#fff;color:#1d2a20;box-shadow:0 12px 38px rgb(0 0 0 / 22%)}.project-planner__panel[hidden]{display:none}.project-planner__panel strong{display:block;padding-right:1.5rem;font:700 1.25rem/1.25 Georgia,serif}.project-planner__panel p{margin:.7rem 0 1rem;line-height:1.5}.project-planner__panel>a{display:block;padding:.8rem;border-radius:.35rem;background:#2c5531;color:#fff;font-weight:700;text-align:center;text-decoration:none}.project-planner__panel small{display:block;margin-top:.8rem;text-align:center}.project-planner__panel small a{color:#214126;font-weight:700}.project-planner__eyebrow{margin:0 0 .35rem!important;color:#55715b;font-size:.72rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase}.project-planner__close{position:absolute;top:.55rem;right:.65rem;border:0;background:transparent;color:#344c39;font-size:1.5rem;cursor:pointer}@media(max-width:700px){.project-planner{display:none}}';
      document.head.appendChild(style);
    }
  }

  function addQuoteDiagnostics() {
    const form = document.getElementById('reformaForm');
    if (!form || form.dataset.diagnosticsBound) return;
    form.dataset.diagnosticsBound = 'true';
    let started = false;
    function recordStart(event) {
      if (started || !event.target.matches('input:not([type=hidden]):not([name=_honey]), select, textarea')) return;
      started = true;
      window.bentosTrack('estimate_form_start');
    }
    form.addEventListener('input', recordStart);
    form.addEventListener('change', recordStart);
    // Native constraint validation can block submit before either submit handler runs.
    let invalidInThisTurn = false;
    form.addEventListener('invalid', event => {
      const section = event.target.closest('details');
      if (section) section.open = true;
      if (invalidInThisTurn) return;
      invalidInThisTurn = true;
      window.bentosTrack('estimate_form_error', { error_type: 'validation' });
      queueMicrotask(() => { invalidInThisTurn = false; });
    }, true);
  }

  function addLeadTools() {
    addQuoteDiagnostics();
    addMobileLeadActions();
    addProjectPlanner();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addLeadTools, { once: true });
  else addLeadTools();
})();
