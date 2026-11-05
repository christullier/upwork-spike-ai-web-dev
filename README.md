# Harbourline Home Loans — 24-hour AI-built broker website demo

A complete, responsive **4-page website for a fictional Sydney mortgage broker**. It is a portfolio demonstration: the business, reviews, ABN and licence numbers are sample data. It is not financial advice.

The demo shows the full delivery workflow in one live link: premium design, working lead capture, appointment booking, an AI-style enquiry qualifier, a conversion calculator, newsletter sign-up and visible marketing integrations — all with no backend and no API keys.

## Pages

| Page | Shows |
|---|---|
| `index.html` | Hero with CTAs, trust strip, service cards, **borrowing power estimator**, testimonials, FAQ, CTA band |
| `services.html` | Six loan services. Each "Get started" link pre-fills the contact form (`?service=`) |
| `about.html` | Founder profile (Kate Brennan), credentials, values, timeline |
| `contact.html` | Validated **enquiry form**, **booking widget** (next 5 business days × 5 slots), office hours and map placeholder |

## Interactive features

- **Harbourline Assistant** (chat, bottom-right). Four qualifying questions, then it scores the lead **Hot / Warm / Cold** and routes it: Hot → booking, Warm → name + email capture, Cold → lead-magnet newsletter. Rule-based, no API key needed.
- **Integration Inspector** (the `</>` button, bottom-left). Three tabs — **Events** (dataLayer), **CRM Payloads** (GoHighLevel / Calendly / Kit), **Stored Leads** (localStorage). Every CTA, form, booking, signup and calculator result logs here, so the integrations are *visible* on a call or in a screen recording. "Clear demo data" resets everything.
- **Tracking.** All events push to `window.dataLayer` (`cta_click`, `generate_lead`, `book_appointment`, `newsletter_signup`, `calculator_complete`, `chatbot_qualified`), ready for Google Tag Manager / GA4.
- **SEO.** Unique title + meta description per page, Open Graph tags, canonicals, `FinancialService` and `Person` JSON-LD, `sitemap.xml`, `robots.txt`.

## Stack

Plain static HTML + one shared CSS file + one shared vanilla-JS ES module. No framework, no build step, no server code, no keys. Everything persists in the browser only.

## Re-skin for a new client brief

1. `assets/styles.css` — change the `:root` brand tokens (colour, radius, font).
2. HTML files — swap copy, service cards, testimonials. Header/footer repeat on 4 pages; use find-and-replace on the brand name.
3. `assets/app.js` — edit the `CONFIG` object at the top (site name, phone, pipeline name).

## Go live for real

1. **GoHighLevel:** set `CONFIG.ghlWebhook` to the real inbound webhook URL and replace the "simulated" branches in `ghlPayload()` / `saveLead()` with `fetch(url, { method: "POST", ... })`.
2. **Calendly:** replace the `#booking` block in `contact.html` with the official Calendly embed script, or point `CONFIG.calendlyUrl` at the real link.
3. **Kit / ConvertKit:** swap `newsletterSignup()` with the Kit form POST and your form-id.
4. **GA4 / GTM:** paste the GTM container snippet into each page `<head>`. The event names above map straight to GA4 custom events.
5. Update `<link rel="canonical">`, the `og:url` tags and `sitemap.xml` to the client's production domain.

## Deploy

Cloudflare Pages, no build needed: connect the repo, leave the **build command empty**, set the **output directory to `/`**. Or drag-and-drop this folder into a direct upload. Any static host works the same way.
