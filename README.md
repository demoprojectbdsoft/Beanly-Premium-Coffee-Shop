<div align="center">

# ⚡ Sparq

### *Your one-stop electronics store — browse, compare, buy, track.*

**A full-stack electronics e-commerce platform with role-based dashboards.**

[![Frontend Repo](https://img.shields.io/badge/Frontend-Repository-2ea44f?style=for-the-badge)](https://github.com/demoprojectbdsoft/Sparq-Electronics-Store)
[![Server Repo](https://img.shields.io/badge/Server-Repository-blue?style=for-the-badge)](https://github.com/demoprojectbdsoft/Sparq-Server)
[![Internship Project](https://img.shields.io/badge/Type-Internship%20Project-orange?style=for-the-badge)]()

</div>

---

## 📑 Table of Contents

- [📖 About](#-about)
- [🎯 Project Overview](#-project-overview)
  - [Target Audience](#target-audience)
  - [Platforms Used](#platforms-used)
- [🔐 Auth & Access Flow](#-auth--access-flow)
- [✨ Features](#-features)
- [⚙️ Functionalities](#️-functionalities)
- [🔒 Security](#-security)
- [📦 npm Packages Used](#-npm-packages-used)
- [🔑 Environment Variables](#-environment-variables)
- [🚀 Getting Started](#-getting-started)
- [🗺️ Future Roadmap](#️-future-roadmap)
- [🎓 About This Project](#-about-this-project)

---

## 📖 About

Sparq is a full-stack electronics e-commerce platform — a dynamic, database-driven storefront with cart, wishlist, multi-method checkout, order tracking, reviews, a loyalty points system, and separate customer and admin dashboards. Nothing in the catalog, categories, or homepage content is hardcoded — categories, products, and the homepage slider are all managed from the admin dashboard and served from MongoDB.

---

## 🎯 Project Overview

### Target Audience

| Audience | What they get |
|---|---|
| **Shoppers** | Browse and buy electronics online. |
| **Store Admins** | Manage the catalog, orders, users, and reviews. |
| **Developers / Recruiters** | A demonstration of full-stack, role-based application development. |

### Platforms Used

| Layer | Choice |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, Tailwind CSS v4, HeroUI v3 |
| Backend | Node.js, Express.js, TypeScript ([server repository](https://github.com/demoprojectbdsoft/Sparq-Server)) |
| Database | MongoDB Atlas (Mongoose) |
| Auth | better-auth — JWT via JWKS, email/password and Google Social Login |
| Hosting | Vercel (frontend) and Vercel Serverless Functions (backend) |
| Image Hosting | ImgBB |

---

## 🔐 Auth & Access Flow

```
Sign in (email/password or Google) → better-auth issues a JWT
        │
        ├─ Frontend routes by role: admin → /dashboard/admin, customer → /dashboard/customer
        └─ Backend verifies the JWT on every request via requireAuth + requireRole(...)
```

Role checks run on both sides — frontend route guards and backend middleware both enforce access, so a role check can't be bypassed through the UI.

---

## ✨ Features

### 🏬 Storefront (Public)
- **Dynamic homepage** — hero slider, Popular/Trending Products, Warehouse Deals, New Arrivals, promo banners, and newsletter signup.
- **Category mega-menu** — desktop and mobile menus driven by live category/subcategory data.
- **Shop page** — search, filters, sorting, pagination, and a product details page per slug.
- **Store Locator** — a page for finding physical store locations.
- **Language translator** — a built-in switcher to translate the storefront on the fly.
- **Dark / Light theme** — via `next-themes`.
- **Installable as an app (PWA)** — a web manifest for installing Sparq to desktop or mobile.

### 🛍️ Shopping Experience
- **Cart & Wishlist** — persisted per user in the database, synced across devices.
- **Product reviews & ratings** — a product's rating and review count are recalculated from its actual reviews.
- **Checkout** — Cash on Delivery or mobile wallet (bKash / Rocket / Nagad) with OTP verification.
- **Order tracking** — a Track Order page and full status history per order.
- **Loyalty points & membership** — points on every order, tracked against a membership tier.

### 👤 Customer Dashboard
- Overview, Orders, Transactions, Wishlist, Reviews, Analytics (with CSV export), Profile, and Settings.

### 🛠️ Admin Dashboard
- **Catalog management** — categories, subcategories, and products, with image upload, badges, and stock.
- **Homepage slider control** — add, reorder, and manage slides by selecting an existing product.
- **Order & transaction oversight** — platform-wide tables with status updates.
- **User management** — change user role and account status.
- **Review moderation** — view and manage all product reviews.
- **Profit & sales analytics** — daily/weekly/monthly/yearly profit, exportable to CSV.

---

## ⚙️ Functionalities

- **Order creation pipeline** — placing an order validates stock, computes totals, creates the order and linked transaction, logs status, decrements stock, and clears the cart — in one backend flow.
- **Delivery-triggered loyalty points** — points are credited, and the membership tier re-checked, only when an admin marks the order delivered.
- **Auto-settled COD transactions** — a COD transaction stays `pending` until delivery, then flips to `success` automatically.
- **Countdown-driven pricing** — once a slide's countdown ends, its discount reverts to 0 and price reverts to original.
- **Self-correcting ratings** — ratings are recalculated from actual review documents, never stored stale.

---

## 🔒 Security

- **Shared JWT auth** — the frontend owns authentication via better-auth and exposes a JWKS endpoint; the backend verifies every request against it, with no shared secret.
- **Role-isolated dashboard access** — route guards keep each role confined to its own dashboard.
- **Guarded review eligibility** — only signed-in users who purchased and received the product can review it, once per product.
- **Suspended-account restrictions** — a suspended user can't add new items to cart, but can still check out existing ones.
- **Self-service account deletion** — requires password re-verification.
- **Server-trusted money math** — prices, discounts, shipping fees, and totals are always computed server-side.

---

## 📦 npm Packages Used

| Package | Purpose |
|---|---|
| `next` | React framework — App Router, SSR, Server Actions |
| `react` / `react-dom` | Core UI library |
| `@heroui/react` / `@heroui/styles` | Component library (HeroUI v3) |
| `tailwindcss` | Utility-first CSS |
| `better-auth` / `@better-auth/mongo-adapter` | Authentication — email/password, Google OAuth, JWT/JWKS |
| `mongodb` | MongoDB driver |
| `next-themes` | Dark / Light theme switching |
| `lucide-react` / `react-icons` | Icon sets |
| `react-fast-marquee` | Brand logo marquee |
| `react-toastify` | Toast notifications |
| `recharts` | Analytics dashboard charts |

---

## 🔑 Environment Variables

Create a `.env.local` file in the project root:

```env
# Backend API base URL
NEXT_PUBLIC_API_URL=your_backend_api_base_url

# better-auth
BETTER_AUTH_SECRET=your_auth_secret
BETTER_AUTH_URL=your_app_url
NEXT_PUBLIC_CLIENT_URL=your_app_url

# MongoDB
MONGODB_URI=your_mongodb_atlas_connection_string
DATABASE=your_database_name

# Google Social Login
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

> ⚠️ Never commit `.env.local`. `NEXT_PUBLIC_*` variables are baked in at build time — rebuild after changing one.

---

## 🚀 Getting Started

```bash
# 1. Clone the repository
git clone https://github.com/demoprojectbdsoft/Sparq-Electronics-Store.git
cd Sparq-Electronics-Store

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

> 💡 The [Sparq-Server](https://github.com/demoprojectbdsoft/Sparq-Server) backend must be running and reachable at `NEXT_PUBLIC_API_URL`.

---

## 🗺️ Future Roadmap

- [ ] **Live delivery tracking** — real-time GPS tracking for a rider/courier role.
- [ ] **"Lucky Box" gamification** — a points-based mystery-box reward.
- [ ] **Points-redeemable discounts** — spending loyalty points directly at checkout.
- [ ] **Real-time settings sync** — live, instantly-applied store configuration.
- [ ] **Live chat support** — in-app chat with store support/admins.
- [ ] **Coupons & promo codes** — discount codes applied at checkout.
- [ ] **Real payment gateway integration** — Stripe/SSLCommerz/bKash, replacing the simulated flow.
- [ ] **Push / email notifications** — order and promotional alerts.
- [ ] **Product comparison** — side-by-side spec comparison.

---

## 🎓 About This Project

An internship project for learning and demonstration — not distributed under an open-source license. Feel free to explore the code, but please reach out before reusing or redistributing it.