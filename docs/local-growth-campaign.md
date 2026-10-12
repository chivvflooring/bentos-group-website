# Bento's Group: local repeat-exposure pilot

Prepared October 11, 2026. This is a launch plan and link-measurement implementation, not an active advertising campaign. No new ad spend, customer-list upload, Meta Pixel or personalized advertising was activated by this change.

## What to borrow from Cardone

Cardone's public marketing material emphasizes consistent publishing, multiple channels, useful content and personal sales follow-up. His exact campaign stack, spending, audiences and the reason any individual sees an ad are not public evidence available here. Repeated ads can result from retargeting, broad targeting or engagement signals; one person's feed does not identify the mechanism.

Copy a manageable subset: one service, three recurring messages, one estimate destination, and a source-to-sale ledger. Focus on flooring before expanding into bathrooms, kitchens, smaller projects and custom homes. Free-to-view material may be promoted by paid ads; organic posting has no media charge but still takes work. There is no promised 20–30% growth rate.

## The first campaign

Offer: **Not sure whether to refinish or replace your floors? Start with your city, floor type and project photos. Request a flooring assessment and written estimate.** Photos help start the discussion; site conditions determine the final scope and price.

Destination: `/flooring`, with direct call, text and flooring-estimate actions. Keep the homepage's custom-home positioning separate from this flooring campaign.

### Three content drafts

1. **Decision:** “Refinish or replace? Before buying new flooring, check the existing floor type, remaining wear layer and damaged areas. Bento's Group can discuss the options for your North Atlanta home. See what affects the decision and request a flooring estimate.” Use genuine floor close-ups or Charles explaining the decision; do not present renders as finished work.
2. **Proof:** “The details matter: preparation, transitions, stairs and the finish. Explore flooring work from Bento's Group, then tell us what you want to improve in your home.” Use approved real project images with accurate scope captions. Do not invent before/after pairings, customer reviews or project cities.
3. **Next step:** “Planning a flooring project? Tell us your city, the rooms involved and whether you want refinishing or replacement. Call, text your photos, or request an estimate from Bento's Group.” No invented discounts, deadlines or promised start dates.

Use the same useful message in an Instagram Reel, Facebook post and Google Business Profile update, adapted to each channel. Publish only through confirmed business accounts. Organic content is ready to stage; these drafts have not been posted.

## Ready-to-use tagged links

These shared labels identify the intended distribution channel, not individual visitors. Only the six known `campaign` values are carried across internal page links and into the quote payload. The change does not create a cookie or browser-storage record. Untagged traffic remains unattributed by this feature. Copied links can travel to other channels, so these labels are not independently verified ad attribution.

| Placement | URL |
| --- | --- |
| Instagram organic | https://bentos-group.com/flooring?campaign=flooring-instagram-organic&utm_source=instagram&utm_medium=organic_social&utm_campaign=flooring-refinish-or-replace |
| Facebook organic | https://bentos-group.com/flooring?campaign=flooring-facebook-organic&utm_source=facebook&utm_medium=organic_social&utm_campaign=flooring-refinish-or-replace |
| Google Business Profile | https://bentos-group.com/flooring?campaign=flooring-google-business&utm_source=google&utm_medium=organic&utm_campaign=gbp-flooring |
| Nextdoor organic | https://bentos-group.com/flooring?campaign=flooring-nextdoor-organic&utm_source=nextdoor&utm_medium=organic_social&utm_campaign=flooring-refinish-or-replace |
| Future Meta retargeting ad | https://bentos-group.com/flooring?campaign=flooring-meta-retargeting&utm_source=meta&utm_medium=paid_social&utm_campaign=flooring-return-visit |
| Google Search ad | https://bentos-group.com/flooring?campaign=flooring-google-search&utm_source=google&utm_medium=cpc&utm_campaign=flooring-search |

After this code is deployed, submitted inquiries from these links contain `Campaign Tag` and `Campaign Label`; existing source page and chosen service stay intact. Existing analytics events also carry the allowlisted `bentos_campaign`. GA4 custom-dimension setup and report receipt remain account tasks. The full UTM string is measured on the entry page by the existing analytics code; only the shared campaign label is passed on to subsequent pages. No search term, email, phone or arbitrary query string is copied.

## Paid return-visit ads: activation requirements

Connect the business Meta and Google Ads accounts before editing campaigns. Windsor.ai was suggested as a possible account integration; no connection is confirmed. Inspect current spend, permissions, landing pages, conversion definitions and eligible audience sizes. Do not start another paid campaign simply because a connector is available.

Candidate Meta audience: eligible people who engaged with Bento's own professional Instagram/Facebook account or videos, limited to the agreed service area where account controls allow. Add website visitors only after installing the owner's verified Pixel/dataset, publishing an accurate visitor disclosure and implementing a separate, revocable advertising-personalization choice. Existing cookie acceptance is analytics/ad measurement only and must not be silently reinterpreted as personalized-ad consent. Respect rejection and browser privacy signals. Keep names, contact details and project descriptions out of marketing event payloads.

Candidate website audience: recent flooring visitors who have not submitted a quote; exclude accepted quote submissions where matching is available. Use one combined eligible audience initially rather than tiny city-by-city pools. Review actual availability and size in the account: published thresholds differ by network and can change. If too small, continue useful local content and high-intent search acquisition instead of forcing delivery through broader unrelated targeting. Monitor repeated exposure and rotate creative if frequency increases without inquiries.

Before paid activation: approve the actual account's total budget, audience, creative, duration and stop condition; verify a clearly labeled test quote reaches the inbox and the intended conversion is received once. A quote-button click is secondary engagement, not a qualified lead. No budget increase is authorized by this document. Do not optimize for page views or call-button taps as though they were won jobs.

## What can be learned

Search Console: aggregate searches and landing pages for Bento's own site, subject to privacy omissions and reporting delay. Google Ads search-term reports: available terms that triggered Bento's ads, subject to reporting limits. Social platforms: Bento's own post engagement, comments and messages available to the business. Public local questions: themes such as refinishing versus replacement, moving furniture, duration and material choices; do not harvest private-group content or assemble personal profiles.

None of these tools reveals everyone's private searches, direct messages, browsing history or thoughts. Ad audiences are groups managed by the platform, not a list of identifiable homeowners to contact. Contact people who inquire or opt in through the appropriate channel. Existing estimate requests do not constitute newsletter or promotional-text consent.

## Seven-day operating sequence

- Day 1: deploy and verify link measurement; connect accounts; check conversion delivery and establish the baseline.
- Days 2–4: publish the decision, proof and next-step posts with the matching channel links. Reply to genuine inquiries and record the next action.
- Days 5–7: review eligible audiences and draft a small local return-visit campaign if the account and budget are ready. Reconcile submitted quotes and calls with the lead ledger. Follow up on estimates at the agreed time.

Owner notification and a phone assistant are separate operational dependencies. The prepared phone instructions are in `phone-lead-assistant.md`; neither Quo nor call forwarding has been activated here. Record tests separately from customers.

## Success measures

Use `lead-tracker-template.csv` privately. Record source label, service, genuine inquiry, qualified lead, estimate scheduled, estimate sent, won/lost and next follow-up. Record spend separately. Cost per qualified lead = spend / qualified leads; mark unavailable rather than dividing by zero. Conversion rate = genuine website inquiries / measured website sessions, with the attribution window and consent limitations stated. Reconcile actual calls separately from phone clicks.

Compare equal complete periods. Keep booked revenue, cash collected, direct costs and gross profit separate. This experiment can prove measurement and response are working before it can prove profitable growth. Do not call incomplete Search Console days zero traffic.

## Sources checked October 11, 2026

- Cardone on consistent content, channel diversity and sales follow-up: https://grantcardone.com/market-your-business/
- Cardone's stated omnipresence goal: https://grantcardone.com/3-steps-to-omnipresence/
- Google audience membership and serving eligibility: https://support.google.com/google-ads/answer/2472738?hl=en
- Google consent defaults and updates: https://developers.google.com/tag-platform/security/guides/consent
- Meta business-tools audience terms: https://www.facebook.com/legal/terms/customaudience/update
- Meta retargeting overview (requires login in this review): https://www.facebook.com/business/goals/retargeting
