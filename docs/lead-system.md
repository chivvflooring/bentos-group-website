# Bento’s Group lead workflow

Website inquiries continue through the existing FormSubmit destination. Project cards preserve service and source context. Phone and text clicks measure intent, not completed calls or sales. No CRM or automated follow-up has been activated.

The desktop project-planner button gives visitors a visible, optional path to the estimate form from every public content page. It never blocks navigation and does not identify someone merely because they browse. Contact details are requested only on the estimate form; the planner explicitly says that browsing does not enroll a visitor in marketing. The existing mobile call, text and estimate bar serves the same purpose on smaller screens.

## Lead tracking
Copy lead-tracker-template.csv into a private spreadsheet before entering customer information. Never commit completed lead records to this public repository. Assign one owner per inquiry. Record website inquiries and incoming calls/texts. Statuses: New, Contacted, Qualified, Appointment booked, Estimate sent, Won, Lost. Every open lead needs a next follow-up date.

## Daily routine
Check the quote inbox and missed calls during business hours. Respond as soon as practical. Confirm service, city, scope, timing and budget range. Schedule a consultation when appropriate. Follow up on unanswered inquiries the next business day and a few days later; respect requests to stop. Follow up on estimates on the date agreed with the customer.

## Weekly review
Count actual inquiries excluding tests, qualified leads, appointments, estimates, won jobs and won value. Compare by source/service and review overdue follow-ups. Search Console clicks and GA4 generate_lead events support these records; they do not replace them.

## Measurement
GA4: G-XRBMTBNP58. Confirm generate_lead is marked as a key event in the account. Keep estimate_cta_click and estimate_form_attempt separate. Existing tests guard successful-response-only lead recording and duplicate submission prevention. Verify phone/text links on a phone without sending messages. Clearly label any authorized test form submissions.

## Acquisition
Priority pages: Alpharetta kitchen and Roswell bathroom, based on the September 16 Search Console export. Share relevant service/gallery links with existing contacts. Captions describe visible features without assigning cities or claiming a full-remodel scope. Photo-to-city mapping for Buckhead, Sandy Springs and Alpharetta remains pending.

Next account tasks: confirm GA4 key event; review Google Business Profile accuracy and add approved photos; request honest reviews from completed customers without incentives. These account changes and outbound messages have not been performed by this release.

This release supplies project examples, contact paths and a manual workflow. It does not guarantee leads. Keep customer information out of public code and analytics.

## Interest funnel pilot — September 28
The homepage, blog and floor-care guide now invite visitors to request occasional email ideas about flooring, bathrooms, kitchens or home care. The separate unchecked consent box is required. Requests go to the existing FormSubmit inbox with the selected topic and source pathname; they are not added automatically to a mailing list. Confirm a labeled test reaches the inbox before sharing this opt-in publicly. Keep the source email and consent record in a private subscriber system and honor unsubscribe requests.

Three nine-second silent project photo stories on the homepage use photos from different projects and say so on the page. They do not present still images as live construction footage. GA4 receives `project_video_play` with one allowed topic and `interest_signup` only after accepted form submission. No email, phone, user ID, query string or project text is sent with those events. Treat video engagement as aggregate interest, not a known person's preference.

To activate automated follow-up, connect a verified sending domain and an email platform with a private list, double opt-in, topic segments and an unsubscribe mechanism. Map the four allowed topics, then test the full signup, confirmation, first email and unsubscribe flow before enabling a sequence. Do not bulk-import the quote inbox into marketing; those inquiries did not opt in to updates. A marketing-text program requires a separate affirmative consent and a texting provider with unsubscribe handling; the website does not collect phone numbers for this signup or send promotional texts.

## Website positioning and campaign separation

The homepage foregrounds ground-up construction and major renovations, with dedicated custom-home and full-renovation inquiry paths. The construction story shows project framing in progress, not a finished house. The blue-kitchen warmer paint, coordinated backsplash grout and outlet finishes, staging and adjacent-room sofa and decor are explicitly labeled a proposed visualization of an actual kitchen project. The on-site project-interest form now offers new construction and whole-home renovation alongside kitchen, bathroom, flooring and care topics. Flooring remains available as a service and as the separately targeted Google Ads campaign; do not broaden that $10/day campaign merely because the organic site shows other services. No website subscriber automation or marketing text program is connected yet.

The homepage now has a prominent custom-home / major-renovation / site-development choice. The project intake accepts site-development inquiries and asks for project stage. Site-work and stormwater descriptions explicitly depend on approved civil documents, qualified contractors, permits and agreed scope. No underground or townhouse job photos were present in the repository or found by descriptive Library search, so the site uses only identifiable residential framing photos and makes no photographic claim about those projects. Add actual sitework photos after locating and checking provenance, permissions and location privacy.

For a five-day baseline after publishing, compare GA4 `generate_lead` grouped by the allowlisted `lead_category` (site development, new construction, renovations, kitchens, bathrooms, flooring, other), alongside submitted inquiry emails and actual qualified consultations. Category is populated only after the provider confirms a quote submission; it contains no personal data or project description. Check phone calls separately because click events are not verified calls. The tracking code is prepared, but production events and imported Google Ads conversions still need a live end-to-end check. A five-day window can confirm functioning capture and early interest, not guarantee a major contract.
