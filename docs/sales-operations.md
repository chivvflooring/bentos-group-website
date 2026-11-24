# Production readiness and sales operations

## Release and rollback

1. In Netlify, record the current published deploy ID and confirm that `main` is the production branch. In GitHub, wait for the website checks and inspect the exact draft SHA.
2. In the Deploy Preview scope, set the function secrets below. Submit one clearly labeled test from the staff address per form, verify the expected notification and Punch List acknowledgment, and download the received JPEG. Compare it with the upload control. Repeat with iPhone Safari selecting an original HEIC in Files, then with Android Chrome and desktop. Record browser and OS versions and verify unsupported-photo recovery if native decoding fails.
3. In the Netlify deploy log, confirm that each intake route received a per-IP rule of ten requests per 60 seconds. On the isolated preview, send at most 12 honeypot POSTs from one IP per endpoint, then wait 12 seconds within the same window and check for HTTP 429. Punch List uses `website` and quote uses `_honey`. Confirm normal traffic recovers after the window.
4. Verify that preview operations can load a test lead by ID, excludes it from totals, and persists a signed Resend delivery event. Confirm that public requests to lead operations are denied, and requests without a valid Resend signature do not write events.
5. After owner production approval, scope the secrets to Production, confirm current Netlify and Resend usage are within included allowances, merge the approved SHA, and monitor the Netlify publish. Run the read-only checks on the apex and verify that www redirects to the apex. Verify photo intake, staff notification, acknowledgment, and a labeled consented QA event in GA4 Realtime or DebugView. Keep QA events distinct from business conversions.
6. If intake, routing, or delivery regresses, publish the previously recorded successful deploy in Netlify. Re-run the read-only checks and the authorized QA intake. Revert the offending commit on `main` before another automatic deploy. The previous release may use email-only intake. Preserve the Blob store and reconcile any messages received during that window before restoring storage.

## Function secrets and storage

Scope values separately to Deploy Previews and Production through Netlify. Use independent random secrets with at least 32 bytes of entropy, and keep them in the platform and authorized password manager. An existing Resend sending key may be reused only when its scope permits transactional mail. No paid infrastructure is required by this implementation, but account owners must confirm current included Netlify Blob and function allocations before enabling storage.

| Variable | Purpose |
| --- | --- |
| `RESEND_API_KEY` | Existing transactional sending credential |
| `LEAD_LEDGER_KEY` | Enables storage and keys equivalent-submission fingerprints. Preserve it across deploys. Rotation needs a fingerprint migration to avoid duplicate historical leads. |
| `LEAD_LEDGER_NAMESPACE` | Set to `production` exclusively in the Production context. All other scopes use the separate preview namespace. |
| `LEAD_OPERATIONS_TOKEN` | Staff-only detail access and milestone updates |
| `LEAD_OPERATIONS_READ_TOKEN` | Optional separate aggregate-only credential for health checks |
| `RESEND_WEBHOOK_SECRET` | Signing secret for the matching webhook destination |

When storage is configured and temporarily unavailable, valid requests fail visibly and can be retried. Valid records are written before notification, so a pending notification is visible to operations. Confirm provider retention and reconcile old pending requests before resending. Photos are sent to the authorized inbox and are excluded from Blob storage. Raw provider payloads, recipient addresses and click URLs are excluded from webhook records. Lead records contain private project and contact data. Limit dashboard and API access to authorized staff, agree on a retention period, and use the Netlify Blob console for authorized deletion and access requests.

Register the signed Resend endpoint at `/.netlify/functions/resend-events` for sent, delivered, bounced, complained, clicked, failed and suppressed events available in the account. Use independently scoped webhook secrets and an internal test before enabling live events. Rules deduplicate by provider message and event type. Click counts are unique message clicks and may include security scanners. A provider delivery event confirms recipient-server acceptance. The QA inbox check separately confirms arrival. Keep commercial click tracking off until owner approval and required notice/consent are confirmed.

## Private reporting and follow-up

- Open `/sales/` with the staff bearer token. The dashboard keeps the token in memory and clears lead details when locked. Use the calendar-month project view and the rolling 30-day results. Select an attribution channel and whether the customer is returning based on staff reconciliation. Review additional submissions for the same project before recording qualified sales milestones.

- `GET /.netlify/functions/lead-operations?month=YYYY-MM` returns monthly aggregate counts for the New York time zone. Targets are 20 qualified leads, 12 estimates and 4 signed jobs. Stage dates and payment dates determine their respective months. Delivery and source summaries describe leads received in the selected month.
- An admin token also allows `?view=pipeline&month=YYYY-MM` and `?id=LEAD_ID` for details. Send the token as an Authorization bearer header. The read token grants aggregates only. Keep tokens out of URLs, browser storage and public dashboards.
- Staff record actual milestone decisions using `PATCH` with JSON containing `id`, `stage` and optional ISO `at`. Stages are `qualified`, `appointment`, `estimate`, `signed`, `revenue`, `exclude` and `stop-follow-up`. Qualify after confirming service fit, geography and a reachable customer. Record revenue only when received, using integer `cents` and a stable `paymentId` for each payment on that lead. Mark discovered spam or duplicates excluded. Exact equivalent requests and owner-address tests are handled at intake.
- `GET ?view=follow-up` prepares a private list of leads 2–14 days old that requested email contact, consented, received their acknowledgment and have no appointment, estimate, signed job, recorded opt-out or negative acknowledgment event. It sends no follow-up. Review opt-outs and suppression across all company channels before activating any sender. The quote form has no standalone follow-up opt-in.
- GitHub Actions runs repository tests and site checks. The daily hosted check is read-only. Add the aggregate-only secret to the repository for notification health checks once storage is active. Investigate pending notifications and negative owner delivery events in the provider dashboard. Schedule review of the first of each month and reconcile phone, third-party and offline leads privately. This system captures website form leads.

## Organic search and platform access

The site check audits canonical URLs, sitemap membership, structured-data syntax, and same-site links and images. The production sampling found all 47 sitemap entries returned HTTP 200. Search-engine indexing, impressions and rankings require verified property access. Maintain the existing high-intent local routes for Alpharetta, Roswell, Johns Creek, Sandy Springs, Dunwoody and Buckhead. Add original project evidence and service-specific answers to those pages when available so each route answers its own local intent.

| Platform | Supported no-additional-cost path |
| --- | --- |
| Google Search Console | Use the verified property UI or Search Analytics API for queries, URLs and clicks. Export CSV for a no-cost periodic report. Indexed-page coverage and Google’s canonical selection require the verified property. |
| GA4 | Use the existing property, Realtime and DebugView for event QA, and CSV or the Data API for reporting within quotas. The deployed preview intentionally leaves the production property disabled. |
| Looker Studio | Use Google’s direct GA4 and Search Console connectors for owner-only aggregate dashboards, subject to account and quota limits. Keep lead detail in the private operations system. |
| Google Business Profile | Use Business Profile Manager for the existing location. Business Profile APIs require approved project access and authorization to manage the location. |
| Instagram | Use Meta Business Suite for the existing professional account. Use the Instagram Platform API only with the applicable account, app permissions and review. |
| Nextdoor | Use the claimed business page to correct the phone and verify the licensed-status field. Issue #122 describes the conflicting number and verification needed. Account access is required. |
| Houzz | Use the existing owner profile to correct business-role and credential text after factual verification. Issue #123 covers the public conflict. Use supported dashboard exports or approved integration access where available. |

References: [Search Console API](https://developers.google.com/webmaster-tools), [GA4 Data API](https://developers.google.com/analytics/devguides/reporting/data/v1), [Business Profile APIs](https://developers.google.com/my-business), [Instagram Platform](https://developers.facebook.com/docs/instagram-platform/), [Nextdoor Business](https://business.nextdoor.com/), [Houzz Pro Help](https://www.houzz.com/pro-help).

## Add an original-photo portfolio project

1. Keep approved originals outside the public checkout. Create a JSON manifest there with `slug`, `title`, `category`, `service`, `stage`, `scope`, `estimate_label`, `approved_originals: true`, and `photos`. For each photo provide `file` relative to the manifest, `alt` describing what is visible, and `caption`.
2. Use `new-construction` or `renovation` for category and `in progress`, `completed scope`, or `before and after` for stage. Describe the documented role and licensed partner’s role where applicable. Use the matching estimate service such as `new-construction`, `flooring`, `decks`, or `full-renovation`.
3. Run `python3 scripts/add-portfolio-project.py /path/to/project.json` with ImageMagick 7 installed. The tool creates display-sized WebP variants, strips embedded metadata, and inserts the expandable project and service-specific CTA. For HEIC sources, the local ImageMagick build needs its HEIC delegate.
4. Inspect the displayed photos and alt text on mobile and desktop, confirm the estimate prefill, and run `npm run check:website` before opening the change for review.
