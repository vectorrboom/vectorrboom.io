# Vectorrboom portfolio — privacy-conscious visitor analytics

## Files
- `index.html` — home page
- `portfolio.html` — dynamic 4:5 photo gallery loaded from `/img/<category>/` in the public GitHub repository
- `styles.css` — shared styling plus analytics consent banner styles
- `script.js` — shared site behavior, consent UI, and opt-in Google Analytics 4 tracking
- `privacy.html` — privacy notice and consent preference control
- `assets/` — logo and photographer image used by the site

## Before enabling analytics
1. Create a GA4 property and add a **Web** data stream for `https://vectorrboom.github.io/vectorrboom.io/`.
2. Copy the Measurement ID (format `G-XXXXXXXXXX`).
3. In `script.js`, replace `G-REPLACE_ME` in `GA_MEASUREMENT_ID` with that ID.
4. Commit and push all files to your GitHub Pages repository.
5. Test using GA4 Realtime after choosing **Allow analytics** on the site.

Until a real Measurement ID is set, the consent UI appears, but no GA requests are made even if a visitor allows analytics. Analytics only loads after opt-in; rejecting means GA is not intentionally loaded. GA reports are accessed by signing into the Google account that owns the GA property. Do not publish screenshots or share account access if you want the reports private.

## What is tracked (after consent)
- Page views and source/medium/referrer/campaign attribution handled by GA4.
- Gallery filter choices and opening a photo in the gallery.
- Clicks on booking-email links, concern-email links, Instagram and Pinterest.
- No email contents, names, phone numbers, form contents, or precise GPS coordinates are sent as custom analytics event data.

Use tagged social links to make attribution more reliable:
- Instagram bio: `https://vectorrboom.github.io/vectorrboom.io/?utm_source=instagram&utm_medium=social&utm_campaign=portfolio`
- Pinterest: `https://vectorrboom.github.io/vectorrboom.io/?utm_source=pinterest&utm_medium=social&utm_campaign=portfolio`
- Facebook: `https://vectorrboom.github.io/vectorrboom.io/?utm_source=facebook&utm_medium=social&utm_campaign=portfolio`

## Notes
- The measurement ID is not a password; visitors can see it in page source/network requests. They still cannot access your Analytics reports without permission to the Google Analytics property.
- A visitor may reject or block analytics. Referral information can also be missing because of browser privacy settings, apps, redirects or link sharing.
- This privacy notice is a starting point, not legal advice. Check the laws and rules applicable to your site and audience.
- Keep the public repository free of secrets and credentials.
