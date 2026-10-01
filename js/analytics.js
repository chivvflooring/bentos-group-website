// Bento's Group GA4 property supplied by the owner.
(function () {
  if (!['bentos-group.com', 'www.bentos-group.com'].includes(location.hostname) || window.bentosAnalyticsReady) return;
  window.bentosAnalyticsReady = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  const choiceKey = 'bentos_cookie_choice';
  let choice = null;
  try {
    const saved = window.localStorage.getItem(choiceKey);
    if (saved === 'accept' || saved === 'reject') choice = saved;
  } catch (_) { /* Storage may be unavailable; ask again next visit. */ }
  function consentValue() { return choice === 'accept' ? 'granted' : 'denied'; }
  // Set defaults before loading Google's tag. Denied mode limits tags to
  // consent-aware, cookieless measurement until a visitor chooses.
  window.gtag('consent', 'default', {
    analytics_storage: consentValue(),
    ad_storage: consentValue(),
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    wait_for_update: 500
  });
  // Attribution needs campaign/click parameters in document location. Keep a
  // bounded allowlist instead of forwarding quote details or arbitrary queries.
  const attribution = new URLSearchParams();
  const incoming = new URLSearchParams(location.search);
  ['gclid', 'gbraid', 'wbraid', 'dclid', 'gclsrc', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_id'].forEach(key => {
    const values = incoming.getAll(key);
    if (values.length === 1 && /^[A-Za-z0-9_.-]{1,256}$/.test(values[0])) {
      attribution.set(key, values[0]);
    }
  });
  const query = attribution.toString();
  const page = location.origin + location.pathname + (query ? '?' + query : '');
  let referrer = '';
  try { referrer = document.referrer ? new URL(document.referrer).origin : ''; } catch (_) {}
  window.gtag('js', new Date());
  window.gtag('config', 'G-XRBMTBNP58', {
    page_location: page,
    page_referrer: referrer,
    allow_google_signals: false,
    allow_ad_personalization_signals: false
  });
  const tag = document.createElement('script');
  tag.async = true;
  tag.src = 'https://www.googletagmanager.com/gtag/js?id=G-XRBMTBNP58';
  document.head.appendChild(tag);

  function saveChoice(value) {
    choice = value;
    try { window.localStorage.setItem(choiceKey, value); } catch (_) {}
    window.gtag('consent', 'update', {
      analytics_storage: consentValue(),
      ad_storage: consentValue(),
      ad_user_data: 'denied',
      ad_personalization: 'denied'
    });
    document.querySelector('.bentos-cookie-banner')?.remove();
    const settings = document.querySelector('.bentos-cookie-settings');
    if (settings) settings.hidden = false;
  }

  function addCookieControls() {
    if (!document.body || document.querySelector('.bentos-cookie-settings')) return;
    const style = document.createElement('style');
    style.textContent = '.bentos-cookie-banner{position:fixed;z-index:1000;left:1rem;right:1rem;bottom:1rem;max-width:38rem;padding:1rem 1.15rem;border:1px solid #bed0c0;border-radius:.7rem;background:#fff;color:#1d2a20;box-shadow:0 8px 30px #0004;font:15px/1.5 Arial,sans-serif}.bentos-cookie-banner p{margin:.4rem 0 .8rem}.bentos-cookie-banner__actions{display:flex;flex-wrap:wrap;gap:.55rem}.bentos-cookie-banner button{min-height:44px;padding:.6rem .9rem;border:2px solid #2c5531;border-radius:.35rem;background:#2c5531;color:#fff;font-weight:700;cursor:pointer}.bentos-cookie-banner button[data-choice=reject]{background:#fff;color:#214126}.bentos-cookie-settings{position:fixed;z-index:999;left:1rem;bottom:1rem;min-height:44px;padding:.55rem .8rem;border:1px solid #2c5531;border-radius:.35rem;background:#fff;color:#214126;font:700 13px Arial,sans-serif;cursor:pointer}@media(max-width:700px){.bentos-cookie-banner,.bentos-cookie-settings{bottom:calc(4.8rem + env(safe-area-inset-bottom))}}';
    document.head.appendChild(style);
    const settings = document.createElement('button');
    settings.type = 'button';
    settings.className = 'bentos-cookie-settings';
    settings.textContent = 'Cookie settings';
    document.body.appendChild(settings);
    function showBanner() {
      if (document.querySelector('.bentos-cookie-banner')) return;
      settings.hidden = true;
      const banner = document.createElement('section');
      banner.className = 'bentos-cookie-banner';
      banner.setAttribute('aria-label', 'Cookie choices');
      banner.innerHTML = '<strong>Your cookie choices</strong><p>We use analytics to understand visits and quote requests. Optional cookies also help measure ads. Choose whether to allow these cookies. Your choice does not sign you up for email or text messages.</p><div class="bentos-cookie-banner__actions"><button type="button" data-choice="accept">Accept optional cookies</button><button type="button" data-choice="reject">Reject optional cookies</button></div>';
      document.body.appendChild(banner);
      banner.querySelectorAll('button[data-choice]').forEach(button => button.addEventListener('click', () => {
        saveChoice(button.dataset.choice);
        settings.focus();
      }));
    }
    settings.addEventListener('click', showBanner);
    if (!choice) showBanner();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addCookieControls, { once: true });
  else addCookieControls();
})();
