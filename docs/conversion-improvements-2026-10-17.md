# Inquiry improvements — October 17, 2026

The weekly review found 31 measured sessions, 10 quote-page views and no usable customer form inquiry during October 10–16. Those small totals do not identify a single cause of lost customers. Today’s work removes a concrete contact-preference conflict without claiming that a new customer or revenue has resulted.

## Published changes

- Move the contact preference into the visible contact fields. Email preference requires a valid email and permits an empty phone; phone/text/no-preference requires a usable phone. The module and inline fallback follow the same rules. Changing preference and resetting the form updates native required fields and labels.
- Keep scope, measurements, budget and preferred time optional. Reduce decorative space, use 16px form text and larger controls, make the submit area full width, and add the existing Google customer-review destination beside direct calling.
- Correct About, Services and the Cumming/Johns Creek flooring pages: residential hardwood, engineered wood and tile; vinyl for commercial projects. Align affected descriptions, FAQ structured data and service names. Keep city, project and campaign context intact.
- Preserve the existing successful-provider-response lead event, failed-request recovery, owner QA exclusion, consent choices, and contact-click events. Contact clicks and labeled owner tests are not customer leads. This change does not enroll visitors in marketing.

## Verification

- 46 targeted tests passed, including main/fallback email-only requests, phone/text without email, invalid contact rejection, preference changes, form reset, failure recovery, duplicate-submit protection, campaign context and owner-test exclusion.
- Changed HTML has one H1 per page, canonical links, unique IDs, valid JSON-LD and parseable inline JavaScript. Existing CRLF line endings on city pages preserved.
- No new real FormSubmit message was sent during these tests; delivery was mocked. The prior October 15 delivery check is historical evidence, not a new end-to-end check of this release. No fresh visual browser QA was available in this workspace.
- Google Ads report returned Flooring Leads – North Atlanta – Search 2 as PAUSED. A conversion-action settings report returned no rows; that is not evidence that no conversion action exists. Primary-goal/import configuration remains unverified, and no Ads settings or budget were changed.

## Next decision

Before restarting paid traffic, verify the actual primary conversion/import configuration and reconcile real inquiries with ad attribution. Continue to track qualified inquiries, accepted work, collections and matched direct costs separately. Existing customer estimates and follow-ups can produce revenue independently of these site changes; do not attribute their payments to marketing without evidence.
