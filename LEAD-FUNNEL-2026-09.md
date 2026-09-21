# Bento's Group lead funnel — September 14, 2026

## Verified baseline and limits
- GSC report retrieved earlier today, August 15–September 11: 3,550 impressions, 14 clicks, 0.39% CTR, average position 18.9.
- Earlier query examples: "affordable bathroom remodel roswell": 19 impressions, zero clicks, position 14.47; "alpharetta kitchen remodeling": 6 impressions, zero clicks, position 13.5. These are small samples, not forecasts or the highest-volume queries.
- Google Business Profile screenshots: verified combined Bento's/CHIVV profile, 4.9 rating with 49 reviews; second profile marked Duplicate. Do not delete or rename listings without reviewing ownership and review continuity.
- Canonical/sitemap correction and supplier-showroom request form were deployed earlier today.
- Fresh GSC Wizard reports are currently blocked: trial ended / subscription required. Do not buy a subscription without owner authorization. The owner can export Search Console performance by query and page instead.
- Changes below do not establish ranking improvements or verified email delivery.

## Funnel implemented in this pass
Search or Business Profile → relevant service page → estimate request → staff response → consultation/site measurement or confirmed supplier visit → written estimate → accepted scope and deposit → completed work → review request.

1. Roswell bathroom and Alpharetta kitchen estimate buttons now go directly to the form with editable service/city context.
2. Homepage provides flooring, bathroom and kitchen estimate choices.
3. Supplier-showroom link preselects flooring and the appointment request. DDCC remains clearly identified as the supplier, not Bento's business address.
4. Form records contact preference and best contact time, allows budgets below $5,000, and no longer defaults to financing interest or urgent scheduling.
5. Inquiry Source Page accompanies the existing email submission; only allowed labels or same-site pathname are captured, excluding referrer query strings and fragments. This is page-level attribution, not full campaign analytics.
6. Quote form uses normal document scrolling for mobile usability.
7. No new analytics account, CRM, paid ad campaign or automated outbound messaging has been connected.

## Staff workflow
| Stage | Required action | Next record |
|---|---|---|
| New inquiry | Check scope, city, contact preference and timing | Assigned person and next follow-up date |
| Contacted | Confirm needs, approximate area, material selection and access | Qualified / not a fit / waiting |
| Appointment requested | Coordinate with homeowner and supplier if applicable | Confirmed date/time |
| Measured | Verify quantities and scope | Estimate due date |
| Estimate sent | Record amount and agreed follow-up | Accepted / declined / pending |
| Won | Obtain agreement and applicable deposit | Job schedule |
| Completed | Close out and request an honest review | Review request date |

Suggested response target: same business day when staffing allows; this is an internal target, not a public promise.

## Immediate gates
- Submit one clearly labelled test inquiry and verify arrival in charlesbgroup@gmail.com, including all appointment/context fields. Browser success alone is not inbox verification.
- Use the existing verified Business Profile. Since customers are not served at the operating address, hide it using Google's service-area settings; owner has not yet confirmed this was done.
- Confirm the real-world business name, core category and accurate services before changing profile identity.
- Confirm DDCC arrangements before confirming customer visits.
- Retrieve 3 months of Search Console queries/pages and Business Profile performance. Separate branded searches from service searches.

## Next content work
- Prioritize services by actual profit, capacity and observed demand, not ranking position alone.
- Improve the two initial pages using actual project photos, scope details, material choices and useful FAQs. Obtain permission before publishing customer names, addresses or identifiable project details.
- Expand to additional cities only with genuine service coverage and distinct useful content.
- Review internal links, mobile rendering, submitted sitemap processing and inquiry delivery.
- Keep business description and supported service facts consistent across website, Business Profile and existing directories.
- Request honest reviews from completed customers without incentives or review gating; respond to existing reviews.

## Weekly measures
Track organic clicks, qualified inquiries, appointments held, estimates sent, won jobs and booked revenue. Record service, city, source page, stage, next action and owner per lead in a private tracker. Never store customer lead data in this public repository.
Do not start paid traffic until inquiry delivery is verified and budget/target services are approved.

## Sources
- Google local ranking guidance: https://support.google.com/business/answer/7091?hl=en
- Google service-area settings: https://support.google.com/business/answer/9157481?hl=en
- User-provided Business Profile screenshots and GSC data retrieved in this conversation.

## Validation
Parsed HTML for duplicate IDs and required form fields; checked inline JavaScript syntax; passed six isolated context/appointment/privacy scenarios. Browser rendering could not be tested because the local browser executable is unavailable. No real inquiry or outbound customer message was sent.


## September 15 update
- Owner confirmed receipt of the test estimate by email. A later unsolicited vendor message is not a qualified customer lead.
- Quote page now allows phone-only inquiries; email is required when email is the selected contact method. Contact preferences and showroom options use expandable sections. Flooring links open showroom options and prefill service/city.
- Fixed competing module/fallback submit listeners so one submission triggers one request. Both paths check explicit FormSubmit JSON acceptance; rejected/unconfirmed requests retain visitor entries and allow retry.
- Preserved the existing honeypot and added a pre-send check. This is limited bot filtering, not a guarantee against human solicitations.
- Added local dataLayer events for estimate clicks, submission attempts, accepted requests, phone and text clicks. No personal form fields or query strings are included. No analytics vendor or reporting destination is installed; these are instrumentation hooks only. generate_lead indicates provider acceptance, not inbox delivery or a qualified customer.
- Confirmation explains the next step and includes call/text links. Showroom requests still require staff confirmation.
- Existing flooring pages in Johns Creek and Cumming now link directly to a contextual estimate request.
- Automated tests cover acceptance/rejection, duplicate-submit prevention, fallback-only submission, failure recovery, prefilled context and event privacy. DOM tests use jsdom. Visual browser QA could not run because browser installation timed out; no actual customer inquiry was sent during automated tests.
- Remaining work: connect the owner's analytics property and verify reports; maintain the private lead follow-up tracker; use current Search Console data and real project evidence to prioritize further content improvements. No paid campaigns or automated outbound messages were started.

## September 16 owner priorities and release status
- Priority inquiries: flooring, custom new construction and painting. Added dedicated homepage entry points with service preselection and relevant project-description prompts. Existing kitchen/bathroom choices remain.
- Johns Creek and Cumming construction estimate buttons now carry service/city context. These are inquiries, not confirmed appointments or construction commitments.
- Prepared locally; GitHub publication/deployment remains blocked by automatic approval review pending explicit approval of the public repository destination chivvflooring/bentos-group-website. No release or live improvement is claimed.

## September 21 service-area funnel
- Added a single service-area directory for Metro and North Atlanta instead of publishing many near-duplicate city pages. It covers the owner-priority areas: Sandy Springs, Dunwoody, Buckhead, Atlanta, Marietta, Alpharetta, Woodstock and Acworth, plus the established Johns Creek, Roswell, Milton and Cumming coverage.
- Each city offers contextual flooring, painting and construction estimate links. The quote form now recognizes each city, prefills the location and records `/service-areas` as the source without retaining URL query strings.
- Updated the homepage service-area section and sitemap to make the directory crawlable through normal internal links.
- This release expands legitimate search and conversion paths but does not guarantee rankings. Distinct city pages should be added only when real local projects, photos, scope details and useful city-specific information are available.
