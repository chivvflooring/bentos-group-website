// Bento's Group GA4 property supplied by the owner.
(function () {
  if (!['bentos-group.com', 'www.bentos-group.com'].includes(location.hostname) || window.bentosAnalyticsReady) return;
  window.bentosAnalyticsReady = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  const page = location.origin + location.pathname;
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
})();
