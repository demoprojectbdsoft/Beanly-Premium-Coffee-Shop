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
7. [Vendor Dashboard](#-vendor-dashboard)
8. [Reports & Exports](#-reports--exports)
9. [Business Rules](#-business-rules)
10. [Site Settings & Branding](#-site-settings--branding)
11. [Maintenance Mode](#-maintenance-mode)
12. [Demo Admin Mode](#-demo-admin-mode)
13. [Security](#-security)
14. [Tech Stack](#-tech-stack)
15. [Project Structure](#-project-structure)
16. [Setup](#-setup)
17. [Project Status](#-project-status)
18. [Roadmap](#️-roadmap)
19. [About This Project](#ℹ️-about-this-project)

---

## 📖 Overview

Sparq is a full-stack electronics e-commerce platform: a dynamic, database-driven storefront with cart, wishlist, side-by-side comparison, multi-method checkout, loyalty points, warranties, order tracking and reviews — plus separate customer, admin, seller and rider dashboards.

Nothing is hardcoded. Categories, products, the homepage slider and the store's own branding (name, fonts, colours, logos, contact details, shipping rules, currency) are managed from the admin dashboard and served from MongoDB.

| Audience | What they get |
|---|---|
| **Shoppers** | Browse, compare and buy electronics, then track and review what they bought. |
| **Store admins** | Manage the catalog, orders, inventories, users, reviews, warranties and the look of the whole store, with CSV/PDF reporting. |
| **Sellers (vendors)** | Apply for a shop, get reviewed, then run their own storefront, catalogue, order board and sales report inside the store — on a plan that decides how far they can go. |
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
| **Vendor** | `/dashboard/vendor` | Run their own shop inside the store — storefront, catalogue, orders and sales report. See [Vendor Dashboard](#-vendor-dashboard). They stay a buyer too: the same account keeps shopping, and their cart, wishlist and personal orders stay open in the [Customer Dashboard](#-customer-dashboard). |

```
Sign in (email/password or Google) ─► better-auth creates a session and issues a JWT
        │
        ├─ Frontend: admin/customer layouts call getRequiredRole(...) → wrong role goes to /forbidden
        └─ Backend: verifies the JWT on every request and enforces ownership + role again
```

- **Role-isolated dashboards** — `dashboard/admin/layout.tsx` requires the admin role and `dashboard/rider/layout.tsx` the rider role, so staff and riders cannot open each other's workspace. The buyer dashboard (`dashboard/customer/layout.tsx`) admits anyone who is allowed to shop — a customer **or a vendor**, because becoming a seller changes the role but keeps the account, so the buyer data built up before approval stays reachable alongside the seller pages.
- **One account, many roles** — a person is not locked to a single line in the table. Approval keeps the same account (a seller is still the buyer they were), and the store team can grant more than one role at once. Three fields drive it: `roles` is the approved list (the source of truth), `activeRole` is the dashboard the account is currently on, and `roleSuspensions` are roles the team has parked — still approved, but the account cannot step into that dashboard until released. `lib/core/roles.ts` (`rolesOf`, `roleOf`, `suspendedRolesOf`, `resolveActiveRole`) is the only reader the UI uses, so a chip, a switcher and a guard never disagree about who someone is.
- **Switching dashboards** — the profile menu lists the roles the account actually holds and drops the account straight into that dashboard's workspace. A parked role is greyed out with a Ban mark and cannot be entered, and the app always re-reads the roles from the server (`GET /users/me/roles`) rather than trusting the token claim, so a role granted or revoked a second ago is reflected on the next navigation.
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
| **Shops** (`/stores`) | Every seller shop trading today — search, sort (*Featured first / Best rated / Newest / Most orders*), a *Featured only* switch and category chips read off the rows on screen. Hidden, suspended and closed shops are not listed; one link away looks exactly like one that never existed. |
| **Shop page** (`/stores/[slug]`) | A seller's own storefront: banner, logo, rating, completed orders, products on the shelf, website and social links, and the shop's own searchable, sortable, paginated list of buyable listings. Only the shop's public face is shown — the seller's phone, email and street address stay where the API keeps them. |
| **Product details** (`/shop/[slug]`) | Gallery modal, specifications, warranty terms, live rating and reviews, and add to cart / wishlist / **compare**. |
| **Compare** (`/compare`) | Up to three products side by side — price, discount, stock, rating, warranty and a full specification matrix. Works for guests. |
| **Cart** (`/cart`) | Quantity changes, removal, and a running subtotal. |
| **Checkout** (`/checkout`) | Delivery details, payment method, reward points, and order placement. A signed-in customer starts with their **default saved address** filled in and can tick **Save this address for next time**. |
| **Order success** (`/order-success/[orderId]`) | Confirmation with the points that were spent and the points that will be earned. |
| **Track order** (`/track-order`) | An order-lookup form with a delivery timeline. The per-order **Track Shipment** view in the customer dashboard is the live one. |
| **Store locator** (`/store-locator`) | Two real sources in one list: the head office, described from Site Settings and placed by the same cached geocoder the tracking map uses, and every seller shop trading today. Type a name, city or area to narrow it; **Near me** asks the browser for a location and re-sorts by straight-line distance, with places that have no coordinates last rather than missing. Seller rows carry no phone — they link to the storefront. |
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
| **Sold by** | A seller's listing names its shop on the card and links to the storefront, wherever cards render — search, category pages, the rails. Platform stock carries no seller and shows nothing, so a shopper never follows a link to a half-known shop. |

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
| **Promo code** | One box in the cart. The code is sent to the API with the product ids and quantities only, and the number that comes back is the number shown — prices, sellers and categories are re-read by the server, so a browser cannot price its own deal. A shop's code quietly ignores another shop's lines and says how much of the basket it covers. Changing the basket re-quotes the code; a code that stops fitting shows the API's own reason and disappears rather than lingering as a fake discount. Checkout is handed the code as a name and prices it again before the order is placed. |
| **Product gallery** | A full-screen image gallery on the product page. |
| **Order tracking** | A Track Order page, plus a per-order **Track Shipment** timeline with carrier, tracking number and estimated delivery. |
| **Delivery response** | Once an order ships, the customer confirms whether it arrived — see [Orders & delivery](#orders--delivery). |
| **Buy again** | Re-add a product from order history straight back into the cart. |
| **Reviews & ratings** | Star rating, written review and up to 5 images (hosted on ImgBB). A product's rating is recalculated from its real reviews. |
| **Warranties** | Coverage is issued on delivery and the panel shows its type, duration, terms and dates before claiming. The claim form takes a reason, a description and up to 5 photos; a record takes one claim, and its status stays visible to the customer until the store resolves or rejects it. |
| **Invoice download** | Any order can be downloaded as a PDF invoice. |

---

## 👤 Customer Dashboard

The buyer workspace. A customer reaches it directly, and an approved vendor keeps reaching it too — becoming a seller never splits the account, so the cart, wishlist and orders built up before approval stay open here (reached from the **Your Shopping** group in the vendor sidebar). Staff and riders, who are not buyers, are refused.

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

The sidebar is grouped so a long menu stays readable: **Store** (products, categories, home slider, promo banners, promotions), **Sales** (orders, deliveries, transactions, coupons), **People** (users, vendor applications) and **Support** (reviews, warranties, messages), with the overview and the notification board on their own at the top and the profile/settings links at the bottom. A link stays highlighted on its own sub-pages, and the overview only lights up on the dashboard itself.

| Area | What the admin can do |
|---|---|
| **Overview** | Revenue, orders, customers and product summaries, profit charts by day/week/month/year with the most sold and highest-earning products, and a recent-orders table. Exportable to **CSV** and **PDF**. |
| **Products** | Add, edit and delete products with image upload, badges and stock. **Stock is optional:** a blank stock field means the product is not stock-tracked, so it is always available — no unit count, no limit in the cart and never marked out of stock — and the In Stock switch hides itself. A **manufacturer warranty** requires the **Brand** row in Specifications, because the claim is filed with the brand. See each product's **sell count** and the **profit or loss** it has made, in the table and in the product view, with the same image gallery modal. |
| **Categories & subcategories** | Manage the hierarchy. Deleting a category also deletes its subcategories, but the whole delete is cancelled if the category or any subcategory still has products. |
| **Home slider** | Add, reorder and manage slides by selecting an existing product. |
| **Promo banners** | Fill in the two promo blocks of the homepage **separately**. Both live on one page: *Promo tiles* (the side-by-side banners between the product rows) and *Promo strip* (the wide band lower down, which shows the first live banner). Each banner has a name for the dashboard, its own image, a free-text small line / bold word / main line, an optional badge and button, a link and a position. Every block shows a live preview built from the real homepage component, and the editor previews the banner as it is typed. **A banner with no image is never drawn**, and a block hides itself when nothing in it is live. |
| **Promotions** | `/dashboard/admin/promotions` — every featured placement on the marketplace, whose shelf it lifts and until when. Two pickers grant one: a **product** is chosen from the catalogue and the seller it belongs to is read from the row, never typed; a **shop** is chosen from the active stores, and being a featured *store* is decided here alone. The window is stated in days (1–365, with 7/14/30/60/90 shortcuts) and every grant keeps an optional reason the seller reads. Running rows can be **ended now** with that reason — a blank box records the API's own words, so a row is never closed without one — and **Run the sweep** does by hand what the nightly job does, telling the team how many shelves went dark. Nothing here is a switch: a platform-owned product is listed but refused, with a pointer to the Products desk, because a grant has to carry an end date |
| **Orders** | Platform-wide orders with search and status filters. Open an order to see items, pricing breakdown, redemption and earned points, warranty state and the customer's response, then move it along the status flow. |
| **Transactions** | Platform-wide payment records. |
| **Coupons** | `/dashboard/admin/coupons` — every discount code in the store on one board, ours and every seller's, because the checkout reads them all from one collection. State tabs carry counts from the same read, a second row narrows to *The store's own / Sellers'*, and a seller's row names the shop that wrote it. **New store code** opens the editor that can cover a whole **category** as well as named products — the picker searches the catalogue on the server, since the store is too large to hand over at once. Stop, resume and clear a code from its row; a spent one is only stopped, in the API's own words. A seller's row has no buttons: their code spends a slot on *their* plan, so it is theirs to write and renew |
| **Users** | Search, filter and manage every account. The Role column shows **a chip per approved role** (the active dashboard is ringed, a parked one is muted with a Ban mark), a `role` filter matches anyone who *holds* that role, and the row modal edits roles as **multi-select toggle chips** with a **per-role suspend** switch beside a whole-account status select. Every account also has a full **[role profile page](#managing-multi-role-accounts)** at `/dashboard/admin/users/[id]`. See also points and membership tier. |
| **Vendor applications** | The seller review queue at `/dashboard/admin/vendors`: one read feeds the table and the per-status chips, so a decision made a second ago is gone from *Pending* on the next render. Opening an application shows the whole submission — store, category, contact, business address, identity documents, chosen plan and the history of every status change — and the desk offers the legal next step only: mark **under review**, **approve** (the account becomes a vendor, the store row is created and the plan period starts) or **reject with a reason** the applicant reads on `/become-a-vendor/status`. Plan prices and limits are edited through the API (`PATCH /vendor-plans/:planId`), so the dashboard always shows the live numbers. |
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

### Managing multi-role accounts

Because one person can shop, ride and sell at the same time, the users desk treats roles as a **set**, not a single dropdown. Every write goes through the API, which re-applies the invariants (admin collapses to one authority, every other pool keeps `customer`, the active dashboard falls back if a held role disappears, a revoked marketplace role clears its state) — the dashboard never trusts its own optimistic list.

| Surface | What it offers |
|---|---|
| **Users table** (`/dashboard/admin/users`) | A chip for each approved role, sorted admin → vendor → rider → customer; the active dashboard gets an accent ring and a suspended role is drawn muted with a struck-through label and a Ban mark, so approved-but-parked reads differently from an open workspace. The `role` filter narrows to holders through the approved array. |
| **Opening a user** | Clicking any row (or its view icon) navigates to that account's role profile page — `/dashboard/admin/users/[id]` — where every control lives; there is no modal and no inline drawer. The role controls (toggle chips to grant/revoke each role through `POST /users/:id/roles`, a per-role suspend switch for marketplace roles that parks or releases just that dashboard through `PATCH /users/:id/roles/suspension` without touching the rest of the account, and a whole-account Active/Suspended select for the customer-level freeze) all sit on that page. |
| **Role profile page** (`/dashboard/admin/users/[id]`) | A server-rendered page that assembles **one panel per role the account actually reached for** — a Customer panel (tier, points, purchases), a Rider panel (a live Online/Offline badge — the same availability switch the rider toggles on their profile — plus vehicle, licence, availability, a link into the application review) and a Vendor panel (store, plan, billing, address, links to the review desk and the live storefront) — under a shared header and a Roles & access card to grant/revoke, set status, and suspend or release a single dashboard. It re-reads the user, orders and any applications on every visit, so it never renders from a stale claim about who someone is. |

Demo-mode guards apply to every write here exactly as elsewhere in the dashboard.

**What the rider application's availability fields do** — the application wizard collects weekly `days`, time `slots` and a `maxDistanceKm`, and the review desk and role profile page show them to the admin. They are informational only: dispatch does not read them. Assignment and acceptance filter on the live switches alone — `User.availability` (the online/offline toggle) and `User.status` — so a declared weekday, slot or distance range currently gates nothing automatically.

---

## 🏪 Vendor Dashboard

A customer the store team approves as a seller gets a workspace of their own at `/dashboard/vendor` — a fourth dashboard with its own layout guard and sidebar (**Overview, Orders, Products, Analytics, Coupons, Promotions, Store Profile, Plan & Billing, Notifications**). A vendor cannot open the admin or the rider dashboard. Because approval keeps the same account, a vendor is still a buyer too: a second **Your Shopping** group in the sidebar reaches the [Customer Dashboard](#-customer-dashboard) (buyer overview, personal orders, wishlist), and a customer who is only an applicant cannot open the vendor workspace at all.

### Becoming a vendor

| Page | What happens |
|---|---|
| `/become-a-vendor` | The public pitch. The three plans are read from the API with their real prices, limits and benefits, so an admin edit shows up here without a code change. Monthly/yearly is one toggle: the yearly card's saving badge and the "≈ per month" line are worked out by `lib/vendorPlan.ts`, never stored |
| `/become-a-vendor/apply` | The six-step application — store, category & contact, business address, identity documents, plan choice, review. Signed-in customers go straight in; a guest is sent to sign in first and comes back to the same step |
| `/become-a-vendor/status` | Where the application stands — *pending*, *under review*, *approved* or *rejected* with the store team's reason — plus cancel-while-pending and resubmit-after-rejection |

- **One account, two roles** — approval does not create a seller account. The same user row turns `vendor`, so the orders, reviews, wishlist, wallet and addresses the customer already had are still there, and a vendor can still shop (only staff and riders are refused the cart).
- **No access while waiting** — a `pending` or `under_review` applicant cannot sign in at all: the auth layer refuses every provider, so neither a password nor a Google login issues a token. The applicant is not lost, though: the status page looks the application up by email after the password has been checked.
- **Rejection is not a dead end** — the reason is shown on the status page and the same application row can be resubmitted, so the reference the emails quote stays stable.

### The seller's own screens

| Page | What it offers |
|---|---|
| **Overview** | The shop as it stands today: the live plan and what it costs, catalogue usage against the plan limit, the store's approval state, and a **Live work** row that counts new / in progress / completed / total orders — *New* turns amber the moment something waits for a decision |
| **Orders** | Only this seller's lines from each checkout. Tabs (All, New, In progress, Completed, Rejected) carry counts from the same read as the rows, search runs over the order number, the customer and the city, and **Accept** sits inline on a new group because it is the one decision that cannot wait. Opening one shows the seller's own items and subtotal, the customer's contact and address, the payment method, the delivery state with the rider's name and phone once one is assigned, the stage history, and the next legal actions. Rejecting asks for a reason and says what happens to the stock |
| **Products** | The shop's own catalogue with per-status tabs, search and the plan usage line above the table — the number that explains why a publish may be refused. One shared editor (`VendorProductForm`) serves *Add product* and every later edit: images, price, stock, category and subcategories, specifications, variants, shipping. **Save draft** never touches the plan limit; **Publish** does, so the form says so before the request instead of after a failed one. Deleting archives a listing, so past orders and warranties keep pointing at a real product |
| **Analytics** | The seller's own sales report for 7 / 30 / 90 / 365 days: revenue earned on delivery with the previous window beside it, delivered orders, units, average order value, value still on the way, the plan's commission and the net payout, a revenue-and-orders chart per day (per month on a yearly window), the order pipeline, top products and the last groups moved. Exportable to **CSV** and **PDF** |
| **Coupons** | The shop's own discount codes: the plan allowance line, tabs for *live / upcoming / expired / stopped* (states the API derives from the dates and the switch, never a stored label), a search box, and one inline editor for writing and amending a code. A seller can only name products from their own shop, so the picker lists exactly those, and store-wide category codes are not offered here at all. Stopping a code keeps it; a code that has already been spent cannot be deleted, because past orders still quote it |
| **Promotions** | The shelf space the plan rents by the day. The allowance line says how many slots are held and how long each placement runs, so the reason a booking is refused is on screen before the click; tabs switch between *On the shelves / Ended / Cancelled* — states the API derives from the clock, never a stored label — and a second row narrows to *Products / Storefront*. **Feature a product** opens an inline picker that lists only this shop's own buyable listings, because a draft would spend a slot on something nobody can find, and the button says how many days it is buying. Live rows count down and offer **End early**; a storefront placement granted by the store team arrives as a row the seller can read but not write. Refusals keep the API's own words, so *already featured for N more day(s)* is not rephrased here |
| **Store Profile** | The storefront as the marketplace holds it. The editable half is the store row buyers will read — name, description, logo, cover, contact, address, socials — while the verification details from the approved application stay read-only, because changing them would need a fresh review. `Visible to buyers` is a switch the seller owns; being featured and being suspended are not |
| **Plan & Billing** | The live plan, its limits and usage, every payment made, the current period and the one before it, an upgrade/downgrade path through the demo checkout, and auto-renew that stops the next charge while keeping the paid days. Nothing on the page is recomputed in the browser — it renders what the subscription endpoint reports, which is the same reading the limit checks use |
| **Notifications** | The same `NotificationCenter` every role uses, on the same single feed, reading the lines addressed to this account — the application decision and the billing events the workspace writes. A seller who marks a group *ready for shipment* does not notify themselves: that line goes onto the store team's shared board, where the rider is assigned. Order-stage lines for the seller's bell are still to be wired |

- **The plan is the contract** — product limits, featured slots, coupon limits, commission, how far back analytics reaches and whether exports may include the per-product and per-order tables are all read from the live plan on the server. The screens show the same numbers because they render the API's answer; the enforcement never lives in the browser.
- **Nothing here reaches another shop** — every vendor read and write resolves the account from the token, and a foreign id answers `404` rather than confirming that the row exists.
- **The storefront is public now** — `/stores/<slug>` shows what this page edits, and the shop's own shelf answers from the same row: the listings that are buyable, and nothing the seller kept as a draft.

---

## 📊 Reports & Exports

Reports come from the same view models the dashboards use, so a CSV and a PDF of the same screen can never disagree.

| Report | Where | Formats |
|---|---|---|
| **Admin overview** | `/dashboard/admin` | CSV, PDF (KPIs, revenue and order charts, recent orders with points used/earned) |
| **Top selling products** | `/dashboard/admin` | CSV |
| **Customer overview** | `/dashboard/customer` | CSV, PDF (spend and savings charts, order history with points used/saved/earned) |
| **Vendor sales report** | `/dashboard/vendor/analytics` | CSV, PDF (KPI tiles, revenue bars with a delivered-orders line, pipeline donut). Depth follows the plan: a `limited` export keeps the summary and the chart data, `full` adds the top-product and per-order tables |
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

### Vendor & multi-vendor orders

- **One checkout, one payment, several fulfilments** — the last step of placing an order groups the lines by seller and writes one `VendorOrder` group per shop, inside the same transaction. Items with no `vendorId` are the platform's own stock and never reach a seller's board.
- **The seller's stages are their own list** — `pending → accepted → processing → ready_for_shipment`, and only those. A seller cannot mark a group shipped, delivered or cancelled: those are pushed down from the parent order and the group follows automatically. `lib/vendorOrderStatus.ts` maps each stage onto the shared order palette and `vendorOrderActions()` decides which buttons a screen may offer, so no two seller screens can disagree about what is legal.
- **Riders belong to the store** — marking a group ready stamps a pickup request and raises a line on the admin's board. When the team assigns a rider, the group copies the parent's delivery and the seller's order detail shows the same rider the customer sees.
- **A rejection restocks** — the rejected lines go back on the shelf, the reason is kept in the group's history, and a later parent status never reopens them.
- **Revenue is earned on delivery** — the sales report counts a group only once it is delivered. Groups ready or shipped are shown beside the total as *on the way*, never inside it, because a seller budgeting on an undelivered parcel would be wrong twice over.
- **The plan caps the report** — how far back analytics reaches, how many products are ranked, and whether an export may carry the per-product and per-order tables all come from the live plan, and the screen shows the window the API actually used rather than the one the URL asked for.

### Loyalty & membership

| Rule | Value |
|---|---|
| Earning | 1 point per currency unit of the discounted subtotal (after any discount code), credited on delivery |
| Redeeming | 100 points = 1 currency unit, minimum 100 points |
| Limit | Points may cover the product total only — the delivery fee is always paid in cash, and a code comes off that total before points are counted |
| Tiers | silver < 1,000 · gold 1,000 · platinum 4,000 · diamond 10,000 |

At checkout the customer flips one switch: *Use reward points*. The page works out the largest amount they can spend, shows it as a green discount line, and updates the total immediately. Points are also shown on the success page, the invoice PDF, both dashboards and every report.

### Discount coupons

A code has one meaning whichever desk wrote it: the store team's global codes and a seller's own codes are the same kind of document and go through the same validator. The browser never multiplies a percentage — the [backend README](https://github.com/demoprojectbdsoft/Sparq-Server#discount-coupons) documents the engine and the full rule table.

| Rule | What the screens do |
|---|---|
| Pricing | The cart posts the code with product ids and quantities only, and shows the number that comes back. Prices, owners and categories are re-read by the API, so a stale price on screen cannot change what anyone pays |
| Order of money | The code comes off the product subtotal, points may then cover only what the code left, and the delivery fee is added on top — the same order checkout charges in |
| One shop's code | Covers only that shop's lines. The cart says how much of the basket the code reaches instead of pretending it discounted the whole total |
| Handover | The cart passes the code to checkout in the url (`/checkout?coupon=CODE`) so a refresh keeps the deal; checkout prices it again before it shows a total |
| Basket changes | The cart re-quotes shortly after the basket changes. A code that stops fitting is replaced by the API's own reason, not left on screen as a phantom discount |
| Refusals | Each carries its real reason — not started yet, expired, fully used, basket too small, nothing in the basket it covers — instead of one blunt *invalid code* |
| The seller's desk | Writes and edits only this shop's codes, can only name its own products, and shows the plan allowance the API counts. A refusal from the plan or a suspended shop arrives as a message on the form, not a redirect away from the dashboard |
| The staff desk | `/dashboard/admin/coupons` lists every code in the store — ours and the sellers' — and writes only ours. A seller's row names their shop and is read-only, because renewing it would spend a slot on their plan and skip the check that stops a suspended shop from trading. A code that has been spent is stopped rather than deleted, so past orders keep quoting it |
| One reading, two desks | `lib/couponWords.ts` draws the badge, the money, the window and what a code covers, and `lib/couponDraft.ts` holds the shape checks and the defaults, so neither desk can describe the same code differently — only whose shelf a code reaches differs between them |
| On paper | The code and the money it took off are stored on the order, so the success page, the order history, the staff order board and the PDF invoice all name it — the printed lines add up to the amount actually charged |

### Featured promotions

A placement is a row, not a checkbox. The `isFeatured` flag on a product or a storefront is written only by the promotions service, so an expired row cannot leave a shelf lit, and the [backend README](https://github.com/demoprojectbdsoft/Sparq-Server#featured-promotions) documents the collection, the two sources and the daily sweep.

| Rule | What the screens do |
|---|---|
| Who buys | The seller buys product slots from the plan on `/dashboard/vendor/promotions`. The store team grants both kinds through the promotions API — a seller's route takes a `productId` and nothing else, so being a featured *shop* is not for sale to the shop |
| How long | Never from the browser: the plan's `featuredDurationDays` on a purchase, an explicit 1–365 day figure on a grant |
| What counts | Only a running placement holds a slot, and the count covers what the shop bought — a grant from the store team is not billed against the seller's allowance |
| Only buyable listings | The picker offers this shop's `published` and `out_of_stock` products, and the API closes a placement the moment its listing is unpublished, hidden or archived |
| A lapse dims the shelves | When a subscription expires — caught by the daily sweep or by the lazy close when the plan is next read — the shop's placements are ended and the flags come off |
| Endings are read | *Live / Ended / Cancelled* is derived against the clock, so the desk tells the truth before the sweep has run |
| Nothing is deleted | Rows are closed with an `endedReason`, so a dark shelf answers why by itself and a past placement still shows its window |
| Two desks, one reading | A placement is drawn by `lib/promotionWords.ts` on both the seller's desk and the staff board, so *Featured*, *Ended* and *Cancelled* mean the same colour and the same window on each — only the point of view differs, because a grant reads as a gift to the seller and as a favour owed to nobody on the board. |
| The rail reads it | A shop lifted by a placement arrives on the homepage's *Featured Shops* rail, the `/stores` list under *Featured only* and its own storefront banner — all three read the same flag, which the API only answers for while the placement is still running. With no placement running the rail is simply not drawn. |

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
│   │   │                       deliveries, transactions, coupons, users (+ the
│   │   │                       per-account role profile at users/[id]), vendor
│   │   │                       applications, promotions, reviews, warranties,
│   │   │                       messages, settings
│   │   ├── customer/           overview, orders, transactions, wishlist,
│   │   │                       reviews, analytics, profile, settings
│   │   ├── vendor/             overview, orders (+ detail), products (+ new,
│   │   │                       + edit), analytics, coupons, promotions, store
│   │   │                       profile, plan & billing, notifications
│   │   └── rider/              overview, requests, deliveries, active,
│   │                           history, earnings, profile, settings
│   ├── (main)/                 home, shop, stores (+ shop page), cart, checkout,
│   │                           compare, track-order, store-locator, order-success,
│   │                           become-a-vendor (pitch, apply, status),
│   │                           about, services, contact, privacy, terms
│   ├── api/                    auth (better-auth) and maintenance status
│   ├── maintenance/            branded maintenance page
│   ├── globals.css             theme tokens (light + dark, brand-driven)
│   └── proxy.ts                maintenance guard
├── components/
│   ├── dashboard/              sidebars and dashboard navbar
│   ├── homepage/               hero slider, product rails, banners
│   ├── shared/                 navbar, footer, status badge, uploader, modals,
│   │                           AppDatePicker (HeroUI shell over react-aria segments + calendar)
│   └── shop/                   product cards, filters, gallery
├── lib/
│   ├── action/                 server actions (cart, orders, coupons, reviews, addresses, ...)
│   ├── api/                    typed API clients used by server components
│   │                           (products, orders, stores for the public shop pages, ...)
│   ├── core/                   session, roles, server fetch, query helpers
│   ├── auth.ts                 better-auth configuration
│   ├── compare.ts              localStorage comparison store
│   ├── csvExport.ts            CSV report builders
│   ├── dashboardPdf.ts         PDF report builders
│   ├── dateTime.ts             order dates rendered in the store timezone
│   ├── orderInvoicePdf.ts      per-order invoice PDF
│   ├── transactionReceiptPdf.ts per-transaction receipt PDF
│   ├── orderStatusStyles.ts    one colour/icon palette per order status
│   ├── vendorOrderStatus.ts    the seller's stages on that palette + the legal next actions
│   ├── vendorProductStatus.ts  the seller's listing statuses and their badges
│   ├── promotionWords.ts       one badge, window and source line per placement, for both desks
│   ├── couponWords.ts          one badge, money, window and scope line per code, for both desks
│   ├── couponDraft.ts          the draft a code is written from: defaults, dates, the shape checks
│   ├── vendorPlan.ts           plan pricing: cycle price, monthly equivalent, yearly saving
│   ├── vendorStatus.ts         application status badges
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

A fourth role, `rider`, works the deliveries the admin ships. The fifth surface is the seller workspace — see [Vendor Dashboard](#-vendor-dashboard).

- **Roles** — `admin`, `customer`, `rider`, `vendor`. An admin grants and revokes these from the [Users desk](#managing-multi-role-accounts), where a single account can hold several at once; the API re-reads the roles from the database on every request, so a change applies immediately instead of waiting for the token to expire.
- **Access** — riders land on `/dashboard/rider` after login and cannot open admin or customer workspaces; layout guards and backend role checks both enforce it.
- **Shopping is for customers** — admin, demo admin, riders and vendors cannot add to cart, add to wishlist or post reviews. The action refuses first, and the API refuses again if the request is replayed.
- **Notifications** — one bell, one page and one set of rules for every role; only the data differs. The store team reads the shared activity board, a customer, rider or vendor reads only their own lines, and each one is also emailed. `/dashboard/<role>/notifications` is the same `NotificationCenter` everywhere: search, type chips with counts, sort, an unread-only switch, dots and a pager. One endpoint serves all of it — the API reads the role from the token and answers `shared`, which is what tells the app where a read mark lives: on the server for a personal line (so it clears on every device), on the device for the shared board (because one admin's read must not clear everybody's dot).
- **Where a line links** — a notification only stores the value to search for, never a route, and `lib/notifications.ts` decides the destination from the reader's side, so an old line still opens the right page after a rename. A line is only linked when a real screen stands behind it: an order or delivery opens its own list (a customer's delivery update opens live tracking, an applicant's rider/vendor application news opens the public status page), and a rider's own request and decline news opens the requests screen. When an activity has no dedicated page — a rider-status notice for someone who already holds the workspace, for instance — the line links **nowhere**: it still clears its unread dot on click but never fires a false redirect onto an unrelated Orders or Deliveries list that cannot show what the notice is about.
- **Application wizard** — the rider sign-up (`RiderApplicationWizard`) is a stepped form with lucide icons on the rail and a small brand dot beside each required label. Date fields (date of birth, licence expiry) use the shared `AppDatePicker` (`components/shared/AppDatePicker.tsx`) — a HeroUI DatePicker shell over react-aria-components' editable segments and calendar, styled with the same surface tokens as every other control and speaking plain `YYYY-MM-DD` strings to the draft, so a blank or malformed value reads as nothing-picked; date of birth caps at today, licence expiry stays open to future dates. The vendor application wizard carries the same required-dot marker for consistency (it has no date fields).
- **Live tracking** — Leaflet + OpenStreetMap (free) on a transport that works on Vercel: the tracking page refreshes every 8 seconds, and optional Ably keys push the same update instantly.
- **Rider workspace** — `/dashboard/rider` opens on eight live stat cards (total, completed, active, pending requests, cancelled, total earnings, this month, average delivery time), an earnings-versus-delivered chart, a pipeline breakdown and the latest jobs. The sidebar adds **Requests**, **Deliveries**, **Active**, **History**, **Earnings**, **Profile** and **Settings**, each on real data.
- **Lists you can actually narrow** — every list supports search, sort (newest, oldest, highest fee), page size and, where it makes sense, a status filter. Assigned jobs past their expiry window are labelled *Expired* on the server so no client clock can disagree.
- **Earnings** — the rider's own fees: total, this month, last 30 days and average per job, with the delivered jobs that produced them.
- **Profile & settings** — name, phone, bio, vehicle type, vehicle number and licence save through the same user API, and the profile photo is uploaded or replaced from the same page (ImgBB upload or a direct URL, just like the customer profile); availability is an online/offline toggle that stops new offers, and the toggle also refetches the better-auth session (which now carries `availability` as an additional field with `disableCookieCache` on the read) so the sidebar's Online/Offline badge flips with it instead of sticking at "Online"; password change revokes other sessions.
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
| Vendor onboarding — public pitch, six-step application, status page, login gate while under review | ✅ Complete |
| Admin review desk for vendor applications | ✅ Complete |
| Seller workspace — store profile, catalogue with plan limits, plan & billing | ✅ Complete |
| Seller order board — own fulfilment groups, accept/prepare/ready, pickup request, rider mirror | ✅ Complete |
| Vendor sales report with CSV and charted PDF exports | ✅ Complete |
| Discount codes — seller's own desk, real validation in the cart, re-priced at checkout, named on the invoice | ✅ Complete |
| Featured promotions — seller buys product slots from the plan, counts them down and can end one early | ✅ Complete |
| Admin promotions board — grant a product or a storefront for a stated number of days, pull one back, run the sweep | ✅ Complete |
| Store-wide coupons desk for the store team — write a code that reaches the whole store, read every seller's beside them, and the code's line on the staff order board | ✅ Complete |
| Public vendor storefronts and shop discovery — `/stores/<slug>` per trading shop, the `/stores` board with search, sort and category chips, the homepage *Featured Shops* rail, "Sold by" links and a store locator that lists the real branch and the real shops | ✅ Complete |
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
- [x] **Coupon & promo codes** — discount codes applied at checkout, priced by the API in the cart and again on the order, with a desk for the store team's own codes beside each seller's.
- [ ] **"Lucky Box" gamification** — a points-based mystery-box reward.
- [ ] **Push and email notifications** — order and promotional alerts.
- [ ] **In-app chat support** — live chat with store support.
- [x] **Self-serve store onboarding** — apply, get reviewed, and run a shop from its own dashboard.
- [x] **Subscription plans** — tiered pricing per store, enforced limits, demo billing and plan-capped analytics.
- [x] **Featured placement bought from the plan** — seller-bought product slots whose window and allowance both come from the live plan, closed by a daily sweep.
- [x] **Promotions board for the store team** — grant a placement, revoke one and run the sweep from the admin dashboard.
- [x] **Public vendor storefronts** — a page per shop under `/stores/<slug>`, plus discovery, featured shops, seller search, "Sold by" links and a store locator wired to real shops.
- [ ] **Multi-tenant stores** — every store gets its own data, branding and subdomain.
- [ ] **Real-time settings sync** — live, instantly applied store configuration.

---

## ℹ️ About This Project

Not distributed under an open-source license. Feel free to explore the code, but please reach out before reusing or redistributing it.
