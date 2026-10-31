<div align="center">

# ⚡ Sparq

### *Your one-stop electronics store — browse, compare, buy, track.*

**A full-stack electronics e-commerce platform with role-based dashboards, loyalty points, warranties and sales reporting.**

[![Frontend Repo](https://img.shields.io/badge/Frontend-Repository-2ea44f?style=for-the-badge)](https://github.com/demoprojectbdsoft/Sparq-Electronics-Store)
[![Server Repo](https://img.shields.io/badge/Server-Repository-blue?style=for-the-badge)](https://github.com/demoprojectbdsoft/Sparq-Server)

</div>

---

## 📑 Table of Contents

1. [Overview](#-overview)
2. [Roles & Access](#-roles--access)
3. [Storefront](#-storefront)
4. [Shopping Experience](#-shopping-experience)
5. [Customer Dashboard](#-customer-dashboard)
6. [Admin Dashboard](#️-admin-dashboard)
7. [Reports & Exports](#-reports--exports)
8. [Business Rules](#-business-rules)
9. [Site Settings & Branding](#-site-settings--branding)
10. [Maintenance Mode](#-maintenance-mode)
11. [Demo Admin Mode](#-demo-admin-mode)
12. [Security](#-security)
13. [Tech Stack](#-tech-stack)
14. [Project Structure](#-project-structure)
15. [Setup](#-setup)
16. [Project Status](#-project-status)
17. [Roadmap](#️-roadmap)
18. [About This Project](#ℹ️-about-this-project)

---

## 📖 Overview

Sparq is a full-stack electronics e-commerce platform: a dynamic, database-driven storefront with cart, wishlist, side-by-side comparison, multi-method checkout, loyalty points, warranties, order tracking and reviews — plus separate customer and admin dashboards.

Nothing is hardcoded. Categories, products, the homepage slider and the store's own branding (name, fonts, colours, logos, contact details, shipping rules, currency) are managed from the admin dashboard and served from MongoDB.

| Audience | What they get |
|---|---|
| **Shoppers** | Browse, compare and buy electronics, then track and review what they bought. |
| **Store admins** | Manage the catalog, orders, inventories, users, reviews, warranties and the look of the whole store, with CSV/PDF reporting. |
| **Developers** | A reference implementation of a role-based, full-stack e-commerce build. |

**This repository is the frontend.** The API lives in [Sparq-Server](https://github.com/demoprojectbdsoft/Sparq-Server) and must be running for anything to load.

---

## 🔐 Roles & Access

| Role | Lands on | Can do |
|---|---|---|
| **Guest** | `/` | Browse the storefront, compare products, and sign up. |
| **Customer** | `/dashboard/customer` | Shop, order, review, claim warranties, manage their own account. |
| **Admin** | `/dashboard/admin` | Everything in the [Admin Dashboard](#️-admin-dashboard). |
| **Demo admin** | `/dashboard/admin` | Explore the admin dashboard and edit catalog data freely — changes are reverted daily. See [Demo Admin Mode](#-demo-admin-mode). |

```
Sign in (email/password or Google) ─► better-auth creates a session and issues a JWT
        │
        ├─ Frontend: admin/customer layouts call getRequiredRole(...) → wrong role goes to /forbidden
        └─ Backend: verifies the JWT on every request and enforces ownership + role again
```

- **Role-isolated dashboards** — `dashboard/admin/layout.tsx` and `dashboard/customer/layout.tsx` each require their own role, so one role cannot open the other's dashboard.
- **Checked on both sides** — the frontend guard is for navigation; the backend repeats the check, so a role check cannot be bypassed through the UI or a hand-made request.
- **Shared JWT auth** — this app owns authentication and exposes `/api/auth/jwks`; the API verifies tokens against it, with no shared secret and no duplicated user table.
- **Forgot password** — `sendResetPassword` in `lib/auth.ts` hands better-auth's one-time link to the API, which emails it from the store's own mailbox. The link works once, expires after one hour, and opens `/auth/reset-password`, where the new password is chosen. A reset also signs the account out on every device. The form checks the address first, so an unknown email says **no account uses this address** instead of claiming a link was sent — better-auth itself replies the same way for every address. That is friendlier for one store but reveals which emails are registered.

---

## 🏬 Storefront

Public pages anyone can visit.

| Page | What it offers |
|---|---|
| **Home** (`/`) | Hero slider, Popular and Trending products, Warehouse Deals, New Arrivals, promo banners, brand marquee and newsletter signup. |
| **Shop** (`/shop`) | Search, filters, sorting, and numbered **pagination** or **infinite scroll** — switchable, and the choice is remembered. |
| **Product details** (`/shop/[slug]`) | Gallery modal, specifications, warranty terms, live rating and reviews, and add to cart / wishlist / **compare**. |
| **Compare** (`/compare`) | Up to three products side by side — price, discount, stock, rating, warranty and a full specification matrix. Works for guests. |
| **Cart** (`/cart`) | Quantity changes, removal, and a running subtotal. |
| **Checkout** (`/checkout`) | Delivery details, payment method, reward points, and order placement. A signed-in customer starts with their **default saved address** filled in and can tick **Save this address for next time**. |
| **Order success** (`/order-success/[orderId]`) | Confirmation with the points that were spent and the points that will be earned. |
| **Track order** (`/track-order`) | An order-lookup form with a delivery timeline. The per-order **Track Shipment** view in the customer dashboard is the live one. |
| **Store locator** (`/store-locator`) | Store locations and contact details. |
| **About** (`/about`) | Headline, story, headquarters note, **opening hours**, contact channels and call-to-action — all editable from **Site Settings → Contact & Socials**. |
| **Services / Contact / Privacy / Terms** | Informational pages, branded from the store settings. The **Contact** page has a working form: it validates the fields on the spot, the API **stores the message** for the admin dashboard, and then emails a copy to the **support** or **contact** address saved in Site Settings, with the visitor's address as the reply-to. |
| **Maintenance** (`/maintenance`) | Shown while the store is paused. See [Maintenance Mode](#-maintenance-mode). |
| **Forbidden** (`/forbidden`) | Shown when a signed-in user opens a dashboard that is not theirs. |

**Across the whole storefront**

| Feature | Description |
|---|---|
| **Admin-controlled branding** | Site name, tagline, SEO meta, fonts, colours, logos, favicon, announcement bar, contact details, opening hours, About page copy, currency and footer text all come from the database — no redeploy needed. |
| **Category mega-menu** | Desktop and mobile menus driven by live category and subcategory data. |
| **Dark / light theme** | Via `next-themes`, with separate light and dark colours and logos. |
| **Language & currency** | A built-in translator for the storefront, and a per-customer display currency. |
| **Installable app (PWA)** | A web manifest installs Sparq to desktop or mobile. |

### Shop browse modes

The shop page lists products two ways, toggled above the grid.

| Mode | Behaviour |
|---|---|
| **Pagination** | Numbered pages with Prev / Next and a "Showing 1–12 of N" summary. |
| **Infinite scroll** | The next batch loads as you approach the bottom, with a progress bar, skeleton cards, a **Load Next Page** fallback and a **Back to top** card at the end. |

Which mode opens first is decided in this order:

```
1. ?mode=scroll in the URL
2. The customer's own preference (Account Settings)
3. The mode they last picked on the shop page (saved in the browser)
4. The store default chosen by the admin in Site Settings
```

Switching mode keeps the current filters, search and sort.

---

## 🛒 Shopping Experience

| Feature | Description |
|---|---|
| **Cart & wishlist** | Stored per user in the database, so they follow the customer across devices. |
| **Compare** | Kept in the browser's `localStorage` (max 3 products) so guests can use it, and the navbar shows a live count. |
| **Checkout** | Cash on Delivery, or a mobile wallet (bKash / Rocket / Nagad) with an OTP step and a transaction id. A shipping address is required only for Cash on Delivery. |
| **Saved addresses** | A customer can keep up to 5 shipping addresses. Checkout pre-fills from the default one and offers the rest as one-tap picks; the profile page lists them with **make default** and **remove**. Saving the same address twice is ignored, and the last remaining address cannot be lost by removing the default — a survivor is promoted instead. |
| **Reward points** | The customer can pay part of the order with loyalty points — see [Loyalty & membership](#loyalty--membership). |
| **Product gallery** | A full-screen image gallery on the product page. |
| **Order tracking** | A Track Order page, plus a per-order **Track Shipment** timeline with carrier, tracking number and estimated delivery. |
| **Delivery response** | Once an order ships, the customer confirms whether it arrived — see [Orders & delivery](#orders--delivery). |
| **Buy again** | Re-add a product from order history straight back into the cart. |
| **Reviews & ratings** | Star rating, written review and up to 5 images (hosted on ImgBB). A product's rating is recalculated from its real reviews. |
| **Warranties** | Coverage is issued on delivery and the panel shows its type, duration, terms and dates before claiming. The claim form takes a reason, a description and up to 5 photos; a record takes one claim, and its status stays visible to the customer until the store resolves or rejects it. |
| **Invoice download** | Any order can be downloaded as a PDF invoice. |

---

## 👤 Customer Dashboard

| Page | What it offers |
|---|---|
| **Overview** | Spend and savings charts, summary stat cards, recent orders with their status and points saved. |
| **Orders** | Full order history: status badge, timeline, **Track Shipment**, **invoice PDF**, **Buy Again**, warranty cards with their claims, and the delivery-response form. The delivery response is final once reported as received or cancelled; *not received* can be updated until it is settled. The toolbar holds a search box, a **status select** with a count per status, a **sort** (newest, oldest, total high or low) and an **Active warranty** switch that keeps only the orders whose coverage is still running. The cards are paged five at a time. |
| **Transactions** | Every payment record for the customer's orders, with search, status filter and sorting. Each row can be downloaded as a **PDF receipt** showing the receipt number, order, method, amount and status. |
| **Wishlist** | Saved products, with add-to-cart. |
| **Reviews** | The reviews they have written, with edit support. |
| **Profile** | Personal details, plus the **saved addresses** list with make-default and remove. |
| **Settings** | Preferences, notifications, security and data — see below. |

### Account settings

| Tab | What the customer can do |
|---|---|
| **Preferences & Localization** | Choose a display currency and language (the currency overrides the store default for that customer only), and how the shop lists products. |
| **Notifications & Alerts** | Manage notification preferences. |
| **Security & Sessions** | Change password (current password required). Changing it revokes all other active sessions. |
| **Privacy & Data** | **Export account data** as JSON (profile, orders, payments, reviews, wishlist, cart, warranties), or permanently delete the account — requires typing `DELETE` and re-entering the password. |

---

## 🛠️ Admin Dashboard

The sidebar is grouped so a long menu stays readable: **Store** (products, categories, home slider, promo banners), **Sales** (orders, transactions), **People** (users) and **Support** (reviews, warranties, messages), with the overview on its own at the top and the profile/settings links at the bottom. A link stays highlighted on its own sub-pages, and the overview only lights up on the dashboard itself.

| Area | What the admin can do |
|---|---|
| **Overview** | Revenue, orders, customers and product summaries, profit charts by day/week/month/year with the most sold and highest-earning products, and a recent-orders table. Exportable to **CSV** and **PDF**. |
| **Products** | Add, edit and delete products with image upload, badges and stock. **Stock is optional:** a blank stock field means the product is not stock-tracked, so it is always available — no unit count, no limit in the cart and never marked out of stock — and the In Stock switch hides itself. A **manufacturer warranty** requires the **Brand** row in Specifications, because the claim is filed with the brand. See each product's **sell count** and the **profit or loss** it has made, in the table and in the product view, with the same image gallery modal. |
| **Categories & subcategories** | Manage the hierarchy. Deleting a category also deletes its subcategories, but the whole delete is cancelled if the category or any subcategory still has products. |
| **Home slider** | Add, reorder and manage slides by selecting an existing product. |
| **Promo banners** | Fill in the two promo blocks of the homepage **separately**. Both live on one page: *Promo tiles* (the side-by-side banners between the product rows) and *Promo strip* (the wide band lower down, which shows the first live banner). Each banner has a name for the dashboard, its own image, a free-text small line / bold word / main line, an optional badge and button, a link and a position. Every block shows a live preview built from the real homepage component, and the editor previews the banner as it is typed. **A banner with no image is never drawn**, and a block hides itself when nothing in it is live. |
| **Orders** | Platform-wide orders with search and status filters. Open an order to see items, pricing breakdown, redemption and earned points, warranty state and the customer's response, then move it along the status flow. |
| **Transactions** | Platform-wide payment records. |
| **Users** | Change a user's role and account status, and see their points and membership tier. |
| **Reviews** | View and moderate every product review. |
| **Warranties** | Review coverage records and process claims. The list opens on **Claims** — only the records a customer has actually claimed, because an untouched warranty needs no admin work — and three selects narrow it further: **status** (every status, or All), **warranty type** (manufacturer, seller, extended, other or no warranty) and the sort order. Status badges (icon + colour) appear in the table and in the modal, and the **Warranty Type** column shows each record's type and duration. The type shown is the one saved on the record when the warranty was issued — the same field the server filters and extends by — so editing a product later never rewrites the cover a past order was sold with. Opening one shows the full coverage (type, duration, terms, dates), the claim with its reason, description and evidence photos, plus one coloured icon button per action — under review, resolve or reject. Every action button locks while a save is in flight, so two decisions can never race. **Email Customer** opens a composer already filled in from the claim (name, product, order, reason, description and coverage) and sends it from the dashboard instead of handing the address to a mail app. **Extend** adds months to the coverage with a required reason, at most three times per record, and the dialog lists every extension already granted beside an `n of 3 used` counter. The extend form only appears while another extension is possible: once the three slots are used the section keeps just the history. Extension is reserved for **Extended warranty** records — a manufacturer or seller warranty covers exactly the period it was sold with, so those records never show the section at all. |
| **Messages** | Every message written on the contact page, filterable by delivery state, searchable by name, email or subject, and sortable by newest, oldest, sender or subject. Opening one shows every stored detail — sender, address, department, subject, the full date and time, the message ID, whether the email copy reached the store inbox (and why not, in the provider's own words) — plus the whole message. **Reply by email** opens a composer above it, with the subject and the visitor's own words already written, and sends from the store address. Deleting stays a row action, so the reading view cannot remove a message by accident. |
| **Notifications** | The bell in the dashboard header, shown to the **store admin and demo admin only** — the customer dashboard has none, because the feed names other people's orders and accounts. Every line is a real event written when it happened: new order, payment (a cash-on-delivery order says so until the payment is collected on delivery), warranties issued by a delivery, a customer cancelling, a new or deleted account, a contact message, and a review being written or edited. **Each line carries its own dot**: clicking it reads that line and opens the screen it is about, already filtered to the record — the order, payment, warranty, account or message. Opening the panel reads nothing by itself; the header shows how many are unread and a **Mark all as read** action, and the bell's own dot disappears only once nothing is left unseen. The read mark is shared across tabs, the feed reloads on focus and once a minute, and each line shows a relative time measured on the server clock. Lines expire after 30 days. |
| **Settings** | Site settings and branding — see [Site Settings & Branding](#-site-settings--branding). |

### Order management

```
confirmed ──▶ processing ──▶ shipped ──▶ delivered
    │             │            │             │
    └─────────────┴────────────┴─────────────┴──▶ cancelled
```

- The **Set order status** picker only offers legal next stages, each shown with a coloured status dot, so an order cannot skip a step or restart after cancellation.
- After shipping, the admin sees *Awaiting Customer Response*: `delivered` and `cancelled` stay locked until the customer reports what happened. Once they do, only the matching side opens — *received* allows `delivered`, while *not received* or *cancelled* allows `cancelled`.
- The order detail shows the full pricing breakdown, including **points redeemed** (money saved) and **points earned** (credited on delivery).
- Every transition is recorded in the order's status history, which is what the customer's timeline renders.

---

## 📊 Reports & Exports

Reports come from the same view models the dashboards use, so a CSV and a PDF of the same screen can never disagree.

| Report | Where | Formats |
|---|---|---|
| **Admin overview** | `/dashboard/admin` | CSV, PDF (KPIs, revenue and order charts, recent orders with points used/earned) |
| **Top selling products** | `/dashboard/admin` | CSV |
| **Customer overview** | `/dashboard/customer` | CSV, PDF (spend and savings charts, order history with points used/saved/earned) |
| **Order invoice** | Customer orders page | PDF |

- The PDFs are generated in the browser with `jsPDF`, including a hand-drawn chart and a wrapped table layout that stays inside the printable width.
- The invoice carries the store's branding, the itemised order, shipping, reward points and the final total.

---

## 📋 Business Rules

How the system behaves behind the screens.

### Orders & delivery

```
Place order ─► validate stock ─► redeem points ─► compute totals ─► create order + transaction
            ─► log status ─► decrement stock ─► clear cart
```

- **One call** — placing an order does all of the above in a single backend request, inside one database transaction.
- **Server-trusted money** — prices, discounts, shipping fees and totals are always computed by the API, never sent from the browser.
- **Delivery response** — once an order ships, the customer reports *Order Received*, *Still Not Received* or *Cancel Order*, with an optional note. The order then resolves to `delivered` or `cancelled`, and the admin's dashboard only offers the matching next step.
- **After delivery** — the payment settles, each product's sold count grows, the points worked out at checkout are credited, the membership tier is re-checked, and one warranty per item is issued from the delivery date. Stock was already reduced at checkout.
- **After cancellation** — the payment is marked failed, the quantity goes back to stock, open warranties expire, and the points are undone: points spent at checkout come back, while points earned only exist on a delivered order and are removed if it is returned.
- **Suspended accounts** cannot add to the cart or check out.

### Loyalty & membership

| Rule | Value |
|---|---|
| Earning | 1 point per currency unit of the discounted subtotal, credited on delivery |
| Redeeming | 100 points = 1 currency unit, minimum 100 points |
| Limit | Points may cover the product total only — the delivery fee is always paid in cash |
| Tiers | silver < 1,000 · gold 1,000 · platinum 4,000 · diamond 10,000 |

At checkout the customer flips one switch: *Use reward points*. The page works out the largest amount they can spend, shows it as a green discount line, and updates the total immediately. Points are also shown on the success page, the invoice PDF, both dashboards and every report.

### Reviews & ratings

A customer can review a product only if **all** of these hold:

1. They are signed in.
2. They are not an admin, and not the product's own owner.
3. They have purchased the product, and that order has been **delivered**.
4. They have not already reviewed that product — one review per user per product.

A review holds a star rating, a written message and up to 5 images. Ratings are recalculated from the actual reviews on every create, update and delete, so they are never stale.

### Warranties

Coverage lives on the server; the dashboard only reads and reacts to it. The [backend README](https://github.com/demoprojectbdsoft/Sparq-Server#warranty-coverage--claims) documents the full pipeline.

- Coverage is created automatically when an order is delivered, one per item, using the product's warranty period, type and terms. Those three values are **copied onto the warranty record**, so the coverage still explains itself if the product is edited or deleted later. A product marked **No warranty** never creates a record.
- Opening a warranty shows its **type**, **duration**, **terms** and activation/expiry dates, plus the days remaining. The type also says **who carries the repair** (the brand, the store, or the plan's terms), so a claim is never a blind guess.
- The **duration is the real one**: the original promise plus every extension the store granted, shown as `18 months (+6 extended)` so a later expiry date is never unexplained. When a warranty is extended the record lists each extension, its reason and the new date.
- While it is active the customer can file one claim: a short reason, a description and up to 5 photos. Claims filed before the form was simplified also carry a problem code, which the customer still sees on their own claim.
- The status is always visible: *Claim Submitted*, *Under Review*, *Resolved* or *Expired*.
- **Resolved** shows the outcome the admin wrote, and **Expired** explains which of the three closings happened: the period ran out, the claim was rejected, or the order went back.
- Cancelling or returning an order voids the coverage it created.
- Every step is also emailed (claim, decision, extension, and the issued coverage) when the server has a mail transport configured.

### Pricing & slider

- Slides reference a real product; price, image and discount are read live.
- A countdown only appears while the selling price is below the original price. When the seller leaves both prices the same there is no deal running, so the timer and the struck-through old price stay hidden on the product card, the product page and the home slider. The three date pickers (add product, edit product, hero slide) hide themselves too and explain why.
- Once a slide's countdown ends, the product's discount reverts to 0 and its price reverts to the original.

---

## 🎨 Site Settings & Branding

One page, split into tabs, controlling how the whole store looks and behaves. Changes are staged until saved, then published with **Publish Changes**.

| Tab | What it controls |
|---|---|
| **Identity & Meta** | Site name, slogan, store type, and SEO meta title and description, with recommended lengths (60 / 160). |
| **Typography & Fonts** | Body and heading fonts from curated Google Fonts, with a live preview. |
| **Theme & Palettes** | Industry palettes (jewelry, fashion, restaurant, bakery, coffee, plants, electronics, robotics) with **Preview** and **Save**. A custom palette creator builds a scheme from a seed colour with auto-harmonise and saves it to **My Presets**. Brand colours, light and dark surfaces and the top-bar gradient are all editable. |
| **Shipping & Delivery** | Free-shipping toggle and threshold, standard and express fees, estimated delivery duration, with a live customer-view preview. |
| **Top Bar & Layout** | Show or hide the announcement bar, edit its text with live preview, and add custom action links. |
| **Logos & Media** | Image + Text, Image Only or Text Only; separate light and dark logos for navbar and footer; brand wordmark; favicon by upload or URL (ImgBB); and the **homepage brand marquee** — any number of partner logos, each with a name, an uploaded logo and an optional link, with a live preview. An empty list hides the whole band instead of showing brands the store does not work with. |
| **Contact & Socials** | Support phone, email, address and social links used in the footer and mobile navigation, plus **opening hours** (one day per line) and every line of the **About page**: headline, intro, headquarters note, opening-hours note and call-to-action. Leave a field empty to keep the built-in text. |
| **System & Security** | Store currency, timezone, footer copyright, the default shop browse mode, and **maintenance mode**. |

**The built-in copy stays topic-neutral.** The storefront ships with wording like *products*, *new arrivals* and *special offers* instead of naming one industry, so switching store type never leaves old text behind. That covers the empty cart, the hero slider placeholder, the homepage promo strips, the store locator, the About page defaults and placeholders, the missing-product page, the sidebar/manifest descriptions and every admin placeholder. Shortcut links point at shop filters (`/shop?sort=newest`, `/shop?hasOffer=true`) instead of fixed category slugs, and a promo banner with no link opens `/shop`, so they keep working whatever the catalog sells.

**The emails follow the same settings.** The API builds every message from this page, so there is nothing to keep in sync by hand:

- `colorPalette.primary` becomes the rule at the top of the card and every button; `primaryDark` colours the heading and `accent` draws the thin rule under it.
- `colorPalette.surface` is the page behind the white card, and the uploaded **logo** sits above the heading.
- `typography.primaryFont` starts the font stack, which ends in Helvetica/Arial because web fonts do not load in a mailbox.
- `supportEmail` and `supportPhone` appear in the footer, and the shop address builds the button that opens the customer's orders.

A change takes effect on the next message, with no redeploy, and the built-in defaults are used whenever a field is still empty.

---

## 🔧 Maintenance Mode

An admin switches it on or off in **Site Settings → System & Security**. It takes effect within a few seconds.

| Visitor | While maintenance is ON |
|---|---|
| **Customer / guest** | Every page, dashboard included, redirects to `/maintenance`. |
| **Admin / demo admin** (signed in) | Full access to the storefront and the admin dashboard. |
| **Sign-in pages** | Always reachable, so staff can log in. |

```
Request ─► proxy.ts
             │
             ├─ static files, /auth, /api/auth, /api/site-settings ─► allowed
             ├─ maintenance OFF ────────────────────────────────────► allowed
             ├─ maintenance ON + admin / demo admin session ────────► allowed
             └─ maintenance ON + anyone else ──► /maintenance?from=<page>
```

**The maintenance page**

- Branded with the store's logo, name and palette gradient, in light and dark.
- Shows a live status badge and a **Check Live Status** button, re-checking the server every 4 seconds.
- When maintenance is switched off it shows "Store is officially back online" and returns the visitor to the page they came from after 3 seconds.
- Shows the store's support email and phone, and **Admin Login** / **Staff Sign In** links.
- Admins can preview it any time at `/maintenance?preview`.

**How it works** — `proxy.ts` (Next.js 16's replacement for `middleware.ts`) reads `maintenanceMode` from the settings API, cached for 3 seconds. For signed-in users it asks better-auth for the session role, cached per session for 30 seconds. If the backend is unreachable, the last known state is kept.

---

## 🧪 Demo Admin Mode

A shared demo admin login lets reviewers explore the admin dashboard safely.

| | Demo admin can | Demo admin cannot |
|---|---|---|
| **Catalog** | Add, edit and delete categories, subcategories, products and slides, and moderate reviews. | Write a review. |
| **Everything else** | — | Change users, orders, transactions, account settings, password or email, or delete the account. Add to cart or wishlist (the cart button is hidden in the admin navbar). |

**Automatic restore** — everything the demo admin changes is reverted by a daily job on the server: added items are removed, edited items return to their original values, and deleted items come back. Real admin changes are never touched.

Technical details are in the [server README](https://github.com/demoprojectbdsoft/Sparq-Server#-demo-admin-mode).

---

## 🔒 Security

| Protection | How it works |
|---|---|
| **JWT on every request** | The API verifies the better-auth JWT against this app's JWKS endpoint. |
| **Role guards** | `getRequiredRole` in the dashboard layouts on the frontend, and `requireAuth` / `requireRole(...)` on the backend. |
| **Identity from the token** | Cart, wishlist, orders, profile and warranties are always resolved from the token, so one customer can never read another's data by changing an id in a request. |
| **Field-level lockdown** | A customer can update only their own profile and only safe fields — `role`, `status` and `points` stay admin-only, so nobody can promote or un-suspend themselves. |
| **Review eligibility** | Enforced server-side — see [Reviews & ratings](#reviews--ratings). |
| **Suspended accounts** | A suspended customer is stopped in the storefront: adding to the cart, reordering and checkout are disabled, with a notice pointing to support. |
| **Demo admin limits** | Restricted to catalog routes only. |
| **Maintenance guard** | While maintenance is on, only a signed-in admin or demo admin passes; customers are redirected, dashboard included. |
| **Account deletion** | Requires typing `DELETE` and re-verifying the password. |
| **Money math** | Prices, discounts, shipping fees, points and totals never come from the client — a tampered payload cannot change what an order costs. |
| **Atomic points** | Spending points is a guarded conditional update in the API, so two tabs cannot spend the same balance twice. |

---

## 🧰 Tech Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, Tailwind CSS v4, HeroUI v3 |
| Backend | Node.js, Express.js 5, TypeScript ([server repository](https://github.com/demoprojectbdsoft/Sparq-Server)) |
| Database | MongoDB Atlas (Mongoose) |
| Auth | better-auth — JWT via JWKS, email/password and Google social login |
| Charts | Recharts (dashboards) and jsPDF (chart-drawn PDF reports) |
| Hosting | Vercel (frontend) and Vercel Serverless Functions (backend) |
| Image hosting | ImgBB |

<details>
<summary><b>npm packages used</b></summary>

| Package | Purpose |
|---|---|
| `next` | React framework — App Router, SSR, Server Actions |
| `react` / `react-dom` | Core UI library |
| `@heroui/react` / `@heroui/styles` | Component library (HeroUI v3) |
| `tailwindcss` | Utility-first CSS |
| `better-auth` / `@better-auth/mongo-adapter` | Authentication — email/password, Google OAuth, JWT/JWKS |
| `mongodb` | MongoDB driver |
| `next-themes` | Dark / light theme switching |
| `lucide-react` / `react-icons` | Icon sets |
| `react-fast-marquee` | Brand logo marquee |
| `react-toastify` | Toast notifications |
| `recharts` | Analytics dashboard charts |
| `jspdf` | Invoice and dashboard PDF reports |

</details>

---

## 📁 Project Structure

```
src/
├── app/
│   ├── (auth)/auth/            login, register, forgot-password, reset-password
│   ├── (dashboard)/dashboard/
│   │   ├── admin/              overview, products, categories, slider, orders,
│   │   │                       transactions, users, reviews, warranties,
│   │   │                       messages, settings
│   │   └── customer/           overview, orders, transactions, wishlist,
│   │                           reviews, analytics, profile, settings
│   ├── (main)/                 home, shop, cart, checkout, compare,
│   │                           track-order, store-locator, order-success,
│   │                           about, services, contact, privacy, terms
│   ├── api/                    auth (better-auth) and maintenance status
│   ├── maintenance/            branded maintenance page
│   ├── globals.css             theme tokens (light + dark, brand-driven)
│   └── proxy.ts                maintenance guard
├── components/
│   ├── dashboard/              sidebars and dashboard navbar
│   ├── homepage/               hero slider, product rails, banners
│   ├── shared/                 navbar, footer, status badge, uploader, modals
│   └── shop/                   product cards, filters, gallery
├── lib/
│   ├── action/                 server actions (cart, orders, reviews, addresses, ...)
│   ├── api/                    typed API clients used by server components
│   ├── core/                   session, roles, server fetch, query helpers
│   ├── auth.ts                 better-auth configuration
│   ├── compare.ts              localStorage comparison store
│   ├── csvExport.ts            CSV report builders
│   ├── dashboardPdf.ts         PDF report builders
│   ├── dateTime.ts             order dates rendered in the store timezone
│   ├── orderInvoicePdf.ts      per-order invoice PDF
│   ├── transactionReceiptPdf.ts per-transaction receipt PDF
│   ├── orderStatusStyles.ts    one colour/icon palette per order status
│   ├── warranty.ts             warranty catalog, duration, extension and problem wording
│   ├── warrantyStatusStyles.ts status badge colours and icons
│   └── currency.ts             formatting helpers
└── types/                      shared TypeScript models
```

**Layering rules** — pages are server components that fetch through `lib/api`; interactive parts live next to them in a `XClient.tsx`; mutations go through `lib/action` server actions. A shared view model (for example a dashboard payload) feeds the screen, the CSV and the PDF, so all three always show the same numbers.

---

## 🚀 Setup

### Environment Variables

Create a `.env.local` file in the project root:

```env
# Backend API base URL
NEXT_PUBLIC_API_URL=your_backend_api_base_url

# better-auth
BETTER_AUTH_SECRET=your_auth_secret
BETTER_AUTH_URL=your_app_url
NEXT_PUBLIC_CLIENT_URL=your_app_url

# MongoDB (better-auth uses the same database as the API)
MONGODB_URI=your_mongodb_atlas_connection_string
DATABASE=your_database_name

# Google social login
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Shared with the API, so it can send the password reset email
INTERNAL_API_KEY=your_long_random_string

# Image uploads (product images, review photos, warranty claims)
NEXT_PUBLIC_IMGBB_API_KEY=your_imgbb_api_key
```

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | **Yes** | Base URL of the API, e.g. `http://localhost:5000/api`. |
| `BETTER_AUTH_SECRET` | **Yes** | Signs sessions and tokens. |
| `BETTER_AUTH_URL` / `NEXT_PUBLIC_CLIENT_URL` | **Yes** | This app's own URL; used as the token issuer and JWKS host. |
| `MONGODB_URI` / `DATABASE` | **Yes** | better-auth stores users and sessions here — the same database the API reads. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | For Google login | OAuth credentials. |
| `INTERNAL_API_KEY` | For password reset | The same value as the API's `INTERNAL_API_KEY`, sent as `x-internal-key` so the API will email the reset link. |
| `NEXT_PUBLIC_IMGBB_API_KEY` | For uploads | Hosts product images, review photos and claim images. |

> ✉️ Email is sent by the API, not this app: claims, claim updates, issued coverage, contact-page messages and the **password reset link** all go out through the **server's** mailer, over **SMTP** from the store's own mailbox (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER` + `SMTP_PASS`, and `MAIL_FROM` set to that same address, e.g. `Sparq <you@gmail.com>`). No domain has to be verified, only an app password from that mailbox. See the [backend README](https://github.com/demoprojectbdsoft/Sparq-Server#environment-variables) — the store name and both inboxes are read from **Site Settings → Contact & Socials** (`siteName`, `supportEmail`, `contactEmail`). Without a configured mailbox the app still works: a contact message is **stored** anyway and shows up under Admin → **Messages** marked as not emailed, and a reset request says plainly that the link could not be sent.

> ⚠️ Never commit `.env.local`. `NEXT_PUBLIC_*` values are baked in at build time — rebuild after changing one.

### Run Locally

```bash
# 1. Clone the repository
git clone https://github.com/demoprojectbdsoft/Sparq-Electronics-Store.git
cd Sparq-Electronics-Store

# 2. Install dependencies
npm install

# 3. Create .env.local with the variables above

# 4. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

| Script | What it does |
|---|---|
| `npm run dev` | Development server with hot reload |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint |

> 💡 The [Sparq-Server](https://github.com/demoprojectbdsoft/Sparq-Server) API must be running and reachable at `NEXT_PUBLIC_API_URL`, otherwise pages load without any data.

---

## 🛵 Rider & Delivery System

A fourth role, `rider`, works the deliveries the admin ships. `vendor` is reserved for the seller add-on.

- **Roles** — `admin`, `customer`, `rider`, `vendor`. An admin changes a role from **Users**; the API re-reads the role from the database on every request, so a change applies immediately instead of waiting for the token to expire.
- **Access** — riders land on `/dashboard/rider` after login and cannot open admin or customer workspaces; layout guards and backend role checks both enforce it.
- **Shopping is for customers** — admin, demo admin, riders and vendors cannot add to cart, add to wishlist or post reviews. The action refuses first, and the API refuses again if the request is replayed.
- **Notifications** — one bell, one page and one set of rules for every role; only the data differs. The store team reads the shared activity board, a customer or rider reads only their own lines (order placed, shipped, delivered, cancelled, delivery requests) and each one is also emailed. A vendor slot is already wired for when the seller workspace ships. `/dashboard/<role>/notifications` is the same `NotificationCenter` everywhere: search, type chips with counts, sort, an unread-only switch, dots and a pager. One endpoint serves all of it — the API reads the role from the token and answers `shared`, which is what tells the app where a read mark lives: on the server for a personal line (so it clears on every device), on the device for the shared board (because one admin's read must not clear everybody's dot).
- **Live tracking** — Leaflet + OpenStreetMap (free) on a transport that works on Vercel: the tracking page refreshes every 8 seconds, and optional Ably keys push the same update instantly.
- **Rider workspace** — `/dashboard/rider` opens on eight live stat cards (total, completed, active, pending requests, cancelled, total earnings, this month, average delivery time), an earnings-versus-delivered chart, a pipeline breakdown and the latest jobs. The sidebar adds **Requests**, **Deliveries**, **Active**, **History**, **Earnings**, **Profile** and **Settings**, each on real data.
- **Lists you can actually narrow** — every list supports search, sort (newest, oldest, highest fee), page size and, where it makes sense, a status filter. Assigned jobs past their expiry window are labelled *Expired* on the server so no client clock can disagree.
- **Earnings** — the rider's own fees: total, this month, last 30 days and average per job, with the delivered jobs that produced them.
- **Profile & settings** — name, phone, bio, vehicle type, vehicle number and licence save through the same user API, and the profile photo is uploaded or replaced from the same page (ImgBB upload or a direct URL, just like the customer profile); availability is an online/offline toggle that stops new offers; password change revokes other sessions.
- **Exports** — the overview downloads as CSV and as a charted PDF (tiles, earnings bars with a delivered line, pipeline donut, recent jobs), using the store's own site name and currency.

**Progress:** Phase 1 ✅ roles & RBAC. Notifications ✅ one feed for every role (bell, page, email). Phase 2 ✅ rider workspace (overview, lists, earnings, profile, settings, exports). Phases 3–7 (admin assignment, delivery lifecycle, tracking, OTP, hardening) follow.

---

## 📈 Project Status

| Area | State |
|---|---|
| Dynamic storefront with admin-controlled branding | ✅ Complete |
| Shop: search, filters, sort, pagination and infinite scroll | ✅ Complete |
| Cart, wishlist and product comparison (max 3) | ✅ Complete |
| Checkout: COD and mobile wallet with OTP | ✅ Complete |
| Loyalty points: earning, redemption at checkout, refunds | ✅ Complete |
| Order tracking, delivery response and invoice PDF | ✅ Complete |
| Warranty coverage, claims and admin email | ✅ Complete |
| Contact page form that stores the message and emails the store | ✅ Complete |
| Saved shipping addresses with a default and a profile list | ✅ Complete |
| Reviews with image uploads and rating recalculation | ✅ Complete |
| Customer dashboard with analytics and data export | ✅ Complete |
| Rider role, rider login redirect and ride/deliver RBAC | ✅ Complete |
| Rider workspace: overview, lists, earnings, profile, settings, CSV/PDF | ✅ Phase 2 of 7 |
| Notifications — one feed, bell and page for every role, plus transactional email | ✅ Complete |
| Admin dashboard with CSV and charted PDF reports | ✅ Complete |
| Site settings: branding, About page copy, opening hours, maintenance mode | ✅ Complete |
| Demo admin sandbox with daily restore | ✅ Complete |
| Rate limiting and a strict CORS allow-list (API side) | ⏳ Planned |

---

## 🗺️ Roadmap

- [x] **Rider role & workspace** — a courier role with its own dashboard, delivery lists, earnings and exports; accepting jobs and advancing order status arrive in Phase 3.
- [ ] **Live delivery tracking** — real-time GPS on the customer's Track Order page.
- [ ] **Real payment gateway** — Stripe / SSLCommerz / bKash, replacing the simulated wallet flow.
- [ ] **Coupon & promo codes** — discount codes applied at checkout.
- [ ] **"Lucky Box" gamification** — a points-based mystery-box reward.
- [ ] **Push and email notifications** — order and promotional alerts.
- [ ] **In-app chat support** — live chat with store support.
- [ ] **Multi-tenant stores** — every store gets its own data, branding and subdomain.
- [ ] **Self-serve store onboarding** — sign up and launch a store in minutes.
- [ ] **Subscription plans** — tiered pricing per store.
- [ ] **Real-time settings sync** — live, instantly applied store configuration.

---

## ℹ️ About This Project

Not distributed under an open-source license. Feel free to explore the code, but please reach out before reusing or redistributing it.
