# Resend funnel activation

The public signup currently delivers email, chosen topic, and explicit consent
to the Bento's Group inbox through FormSubmit. It does not automatically add
contacts to a marketing list. The `subscribe` Netlify Function is prepared but
is **not called by the public form** until the sender and automation are ready.

## Activation sequence

1. Verify `bentos-group.com` as a sending domain in Resend. Set up sender and
   reply-to addresses and test delivery to `charlesbgroup@gmail.com`.
2. Create the seven Resend topics matching the signup form values:
   `new-construction`, `renovations`, `site-development`, `flooring`,
   `bathrooms`, `kitchens`, and `home-care`. Set up a welcome automation for
   each relevant interest. Each marketing email must provide unsubscribe.
3. In the **Netlify site environment**, add `RESEND_API_KEY` with Functions
   runtime access and `RESEND_TOPIC_IDS_JSON` as a JSON object mapping those
   slugs to their real Resend topic UUIDs. Never put the API key in client JS,
   the Git repo, or `netlify.toml`. Redeploy after setting environment values.
4. Test the function with only the business email and verify the correct topic
   subscription and delivery in Resend. Confirm errors do not claim success.
5. Only after the test, connect the public form to the function. Preserve the
   existing consent record and owner notification or replace them with an
   equivalent audited workflow. Check an unsubscribe before broad activation.

An existing unsubscribed contact must not be re-added or re-subscribed without
a fresh, demonstrable request. Estimate requests do not imply marketing
consent. Text messaging needs a separate phone field, SMS consent, opt-out
handling, and an SMS provider; the current signup is email-only.
