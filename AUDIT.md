# Bento’s Group source audit — September 11, 2026

## Scope and guardrails

This repository-only review covered every tracked HTML, CSS, JavaScript, JSON, XML, manifest, CMS, image, font, favicon, and SVG path. No hosting, DNS, analytics, advertising, business-profile, Search Console, or other external account was accessed or changed. No CHIVV-domain redirect is included. Existing customer review text and the FormSubmit quote destination were preserved.

## Brand architecture

**Recommended position:** Bento’s Group is the umbrella remodeling and construction brand. **CHIVV Flooring** is its flooring specialty/division and retains continuity with flooring reviews and social identity. Use wording such as “CHIVV Flooring, the flooring specialty of Bento’s Group” consistently after the owner confirms the legal/trade-name relationship. Do not imply that every historical CHIVV flooring review covers broader remodeling work.

## Findings and repository changes

### Critical: security, privacy, and lead delivery

- **Exposed browser credentials:** `js/chat.js` contained a Groq bearer token, and `js/main.js` contained an IP-geolocation API key. Browser secrets cannot be protected. Both credentials must be revoked/rotated by the owner. The repository now contains neither credential.
- **Undisclosed visitor tracking:** every page loading `main.js` performed an IP-geolocation lookup and posted location to a public ntfy topic after a delay. This was removed. The replacement project helper is local, deterministic, makes no unsupported factual or price claims, and states that messages are not delivered to the team.
- **Quote data duplication:** the quote script copied full lead details to ntfy as well as FormSubmit. The ntfy copy was removed; FormSubmit remains the sole delivery path.
- **False success:** any completed `fetch`, including an HTTP error, was treated as success. Success now requires `response.ok`.
- **Lost service selections:** JavaScript queried lowercase `service`, while the form uses `Service`. This is corrected.
- **Form hardening and usability:** the functioning quote form retains its destination and fields, with browser autocomplete, a honeypot, and a concise processing/contact disclosure.
- **Action required:** verify FormSubmit ownership, delivery, spam settings, retention, and privacy terms. Submit one real staging inquiry before production. Consider a first-party/serverless endpoint with rate limiting and explicit consent as the longer-term replacement.

### SEO and information architecture

- Fixed the incorrect canonical on the Alpharetta remodeling page, removed `.html` canonical inconsistencies on five Cumming pages, added the missing cabinetry canonical, and repaired repeated broken About links.
- Added the orphaned cabinetry, kitchen service, and membership pages to the main sitemap. Keep `free-quote` out while it is intentionally `noindex`.
- Added the missing gallery H1. Generic fallback alt text now prevents unnamed gallery images, but the owner should replace each fallback with an accurate project-specific description and confirm that every photo is owned and depicts Bento’s/CHIVV work.
- Existing location coverage is uneven: Alpharetta has general, kitchen, and bathroom pages; Roswell only kitchen and bathroom; Cumming and Johns Creek have broader sets. Create a page only when there is unique, locally useful content and genuine service coverage—never clone city text merely to fill a matrix.
- Three older pages referenced nonexistent CSS, icons, article URLs, and service routes. Those broken requests now resolve to existing assets or relevant index pages; `home-remodeling-alpharetta-ga.html`, `kitchen-remodeling-service.html`, and `home-remodeling-guide-2025.html` should still be rebuilt on the current shared layout to eliminate drift.
- Titles and descriptions are frequently long (many descriptions exceed ~160 characters). Rewrite for clarity and differentiated intent after keyword/revenue priorities are confirmed; length alone is not a ranking rule.
- Large Organization schema blocks are duplicated across pages and contain claims unrelated to the page. Consolidate reusable organization data and use page-specific Service/Breadcrumb/FAQ data only where visible content supports it. SearchAction should be removed unless site search actually exists.
- Review schema, aggregate ratings, certifications, payment methods, contact options, service areas, and founding dates require evidence. Third-party review markup may not qualify for self-serving local-business rich results and should not be treated as a conversion guarantee.

### Conversion and internal links

- The site has strong repeated free-quote CTAs, but some cards/footer links use `#` or nonexistent URLs. Point each to the closest real service/location page or the quote form only after confirming the offered scope.
- Add a persistent but non-obstructive mobile “Call / Request Quote” bar, only after confirming phone tracking and consent requirements. Avoid opening an unrequested chat overlay.
- Carry service and city query parameters into the quote form, and show an expected response window only after the owner supplies a supportable SLA.
- Add trust adjacent to CTAs using verifiable evidence: license type/holder/status, insurance wording, project photos, review source links, and warranty terms. Do not use unqualified “licensed general contractor,” “licensed in plumbing/electrical,” “bonded,” “premier,” “top-rated,” or experience-duration claims until documented.
- Cabinet estimator prices and “including installation” need owner verification. It currently calculates locally but does not deliver its contact fields; connect it to an approved lead endpoint or remove the contact fields before promotion.
- Newsletter UI has no subscription form. Either integrate an approved consent-based provider or replace it with a link to the remodeling guide.

### Accessibility and mobile

- All pages have viewport metadata and most have one H1; gallery was the exception and is fixed. The 404 page still needs a description/canonical decision, while utility pages may appropriately remain `noindex`.
- Many controls lack robust semantics: gallery album divs/images need buttons and keyboard operation; lightbox needs dialog semantics, focus trapping, Escape close, labelled controls, and focus return; hamburger state should update `aria-expanded`; chat needs a labelled input and live region.
- Repeated empty image alts are appropriate only for decorative icons. Confirm content images have descriptive alt and decorative images use empty alt.
- Test at 320 CSS pixels, 200% zoom, keyboard-only, VoiceOver/TalkBack, forced colors, and reduced motion. Mobile header auto-hide can obscure navigation for keyboard and magnification users.
- The quote page uses an inner scrolling region and locks body scrolling; test carefully on iOS with the keyboard open. Prefer normal document flow in a future layout pass.

### Performance and maintainability

- HTML pages contain hundreds to thousands of lines of duplicated CSS and very large duplicated JSON-LD/review blocks. Extract shared header/footer/styles/schema generation before broad edits to prevent drift and reduce transfer size.
- Gallery depends on many third-party hotlinked images. Move approved, optimized AVIF/WebP variants to controlled storage, define width/height or aspect-ratio, use responsive `srcset`, and retain lazy loading below the fold.
- Fonts are local on most pages, but the quote page uses a render-blocking Google Fonts `@import`. Self-host those fonts or use existing local families.
- `carousel.js` is empty while `testimonials.js` supplies carousel behavior; remove dead requests after verifying every template.
- Use `defer` consistently for scripts; avoid `async` on module scripts where ordering with dynamically injected chat matters.
- There is no build/test configuration. Add a repeatable HTML validator, link checker, JSON-LD parser, accessibility browser test, and Lighthouse CI budget.

## Unsupported claims requiring owner evidence

Before publishing or retaining claims, collect dated evidence for: exact legal name and Bento’s/CHIVV relationship; physical/public address; Georgia contractor license classification and number; plumbing/electrical licensing; bonding and insurance; founding dates (2005, 10+ years, 20+ years, or two decades conflict); NWFA/NTCA/EPA/Mainstream/Hilti/Tramex/BBB affiliations and current status; languages; warranties; financing and accepted payments; exact service areas; response times; prices; review count/rating/source permission; and any “trusted,” “premier,” “best,” “top-rated,” or guarantee language.

## Recommended next sequence

1. Revoke exposed credentials and confirm quote delivery/privacy ownership externally.
2. Owner signs off a single facts sheet and supported brand/legal wording.
3. Repair or retire legacy pages and broken service routes; then normalize navigation and breadcrumbs.
4. Consolidate shared templates/schema, optimize owned media, and implement accessible gallery/navigation/dialog patterns.
5. Build genuinely distinct priority service/location pages from actual projects, permits, materials, process, and FAQs.
6. Add consent-aware measurement only after analytics ownership, events, and privacy copy are approved; establish baselines for calls, qualified forms, and booked jobs.
7. Validate in staging, obtain owner review, and deploy separately. Redirect planning for CHIVV remains explicitly out of scope.
