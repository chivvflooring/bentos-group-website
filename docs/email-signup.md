# Consent-based Resend signup

The public interest forms submit only to `/.netlify/functions/subscribe`. The function validates the email and approved topic, requires the current consent statement, rejects implausibly fast submissions, and silently discards the honeypot. It then creates a contact in the dedicated Resend segment with only the selected topic opted in. It does **not** import estimate requests or any existing leads. An existing contact is not automatically resubscribed through this form.

## Netlify configuration

Add these **Site environment variables** in **Netlify → the Bento's Group site → Site configuration → Environment variables**, scoped to **Functions** (or all scopes), for the Production context:

- `RESEND_API_KEY`: a Resend API key allowed to manage contacts. Store the secret only in Netlify; never put its value in this repository.
- `RESEND_SEGMENT_ID`: `40d66850-e404-4b38-8e4d-b2e584f31d82`, the dedicated “Bento's Group website email signups” segment already created in Resend.

Redeploy after saving the variables. Deploy Previews need their own context values if the form will be tested there.

## Consent record and operations

Each successful request writes a structured Netlify function log containing the normalized email, selected topic, source path, UTC time, and consent version `email-marketing-v1-2026-09-29`. Resend records the segmented contact and its creation time. Set an appropriate Netlify log-retention/export policy before collecting production signups if long-term consent evidence is required.

Do not add quote/estimate contacts or prior leads to this audience without separate, affirmative marketing consent. Every campaign must include a working unsubscribe link and should suppress unsubscribed or complained recipients.

## Before enabling a live campaign

1. Add both Netlify variables above. The dedicated segment and seven topic preferences already exist in Resend. The API key needs full access to create contacts; a sending-only key cannot manage them.
2. Confirm a sending domain in Resend (SPF and DKIM) and configure the campaign From and Reply-To addresses.
3. Deploy, submit a real test address through the production form, and confirm both the successful function log and the contact in the dedicated segment with only the selected topic opted in.
4. Send a test campaign to that address, verify inbox delivery and branding, then use its unsubscribe link and confirm suppression in Resend.
5. Review production function failures and spam volume. Add a managed challenge/rate-limit service if automated traffic gets through the honeypot and timing check.

The bridge being deployed does not itself prove email delivery. The system should not be described as live until steps 3 and 4 have succeeded.
