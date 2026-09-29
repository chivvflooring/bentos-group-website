# Production lead audit — September 29, 2026

## Verification boundary

The production host could not be reached from the audit environment because its outbound proxy returned HTTP 403 before connecting. No test subscriber or estimate was submitted. The checks below therefore distinguish repository behavior from account-level evidence and must not be read as proof of production delivery.

## Email signup

- The subscriber endpoint accepts POST JSON only. It requires a syntactically valid email, an allowlisted topic, affirmative consent, the exact consent version, a safe source pathname, and a completion time between 2.5 seconds and 24 hours.
- Honeypot submissions do not contact Resend. Missing function configuration returns a temporary-unavailable response. Provider failures are not shown as success, and an existing contact is not silently resubscribed.
- A successful function response means Resend accepted the contact API request. It does not prove the address is present in the intended segment, that a campaign reaches the inbox, or that unsubscribe suppression works.
- Account-access requirement: use an address whose owner explicitly consents, then confirm the contact, segment ID, selected topic, consent log, test-message delivery, and unsubscribe state in Netlify and Resend. Never use a fabricated address.

## Estimate request

- The form posts directly to FormSubmit's AJAX endpoint for `charlesbgroup@gmail.com`. A lead event and on-page confirmation occur only after an HTTP-success response containing an explicit `success` value.
- Provider acceptance is not inbox delivery. The UI now says “Request Accepted” rather than claiming delivery. Confirm FormSubmit activation, spam filtering, and receipt in the destination inbox with one clearly labeled, authorized test request.
- Invalid name, email when email follow-up is selected, phone, and location remain client-side. The module implementation now focuses the first invalid control and exposes its error through `aria-invalid` and `aria-describedby`. The fallback also invokes native form validation.
- `generate_lead` records provider acceptance only. Confirm it in GA4 DebugView/Realtime after the authorized request and confirm it is configured as a key event; repository tests cannot prove ingestion by the GA4 property.

## Call and text actions

- All 36 top-level pages containing phone or SMS links load the delegated lead-event handler. The audited source contains 103 such links, all using the existing `+1 678-571-7028` destination. Mobile content pages receive 48-pixel Call, Text, and Request Estimate targets when they do not already provide a purpose-built action bar.
- `phone_click` measures a tap on a `tel:` link. It does **not** establish that dialing began, a carrier connected the call, anyone answered, the call was qualified, or a job resulted. `text_click` similarly measures opening the SMS action, not a sent or received message.
- Actual call reporting requires a call-tracking provider and a tracking number that forwards to the unchanged business line, with number ownership, caller disclosure/consent and retention reviewed. Configure dynamic number insertion only if attribution is required, validate forwarding on real devices, and import provider call outcomes into GA4/Google Ads or reconcile them in the private lead tracker. Account access and an authorized real-phone test are required.

## Required production checks

1. Reach production from an unrestricted device and test empty, malformed-email, unchecked-consent, and missing-topic signup states without submitting.
2. With a consenting test-address owner, complete the Resend verification described above.
3. Send one labeled estimate request with authorization; verify FormSubmit response, inbox and spam-folder delivery, and one GA4 `generate_lead` event.
4. At 320 CSS pixels and 200% zoom, check keyboard opening, form errors, confirmation focus, and Call/Text target placement on iOS and Android.
5. Tap Call and Text without completing either action, then verify only click events appear. Do not describe those events as calls or messages.
