import { Suspense } from "react";
import HeroSlider from "@/components/homepage/HeroSlider";
import CategoriesDropdown from "@/components/shared/CategoriesDropdown";
import PromoBanners from "@/components/homepage/PromoBanners";
import WarehouseDeals from "@/components/homepage/WarehouseDeals";
import TrendingProducts from "@/components/homepage/TrendingProducts";
import PopularProducts from "@/components/homepage/PopularProducts";
import NewArrivals from "@/components/homepage/NewArrivals";
import FeaturedStores from "@/components/homepage/FeaturedStores";
import { Product, Promo } from "@/types";
import type { PublicStore } from "@/types/stores";
import PromoStrip from "@/components/homepage/PromoStrip";
import Brand from "@/components/homepage/Brand";
import { getProducts } from "@/lib/api/products";
import { asStoreList, getPublicStores } from "@/lib/api/stores";
import { getSlides } from "@/lib/api/slides";
import { getPromos } from "@/lib/api/promos";

// The two promo blocks are not defined here any more: their words, images and
// links are rows in the `promos` collection, written in Admin → Promo Banners,
// so the homepage never carries artwork or prices that belong to a different
// kind of store.

// ─── Per-section async server components ─────────────────────────────────────

async function HeroSliderSection() {
  const slidesRes = await getSlides("isActive=true");
  const slides = Array.isArray(slidesRes?.data)
    ? slidesRes.data
    : Array.isArray(slidesRes)
    ? slidesRes
    : [];

  return <HeroSlider initialSlides={slides} />;
}

async function NewArrivalsSection() {
  const res = await getProducts({ sort: "newest", limit: 14 });
  const products: Product[] = res?.data?.products ?? [];
  return <NewArrivals products={products} />;
}

async function TrendingSection() {
  const res = await getProducts({ badge: "trending", limit: 14 });
  const products: Product[] = res?.data?.products ?? [];
  return <TrendingProducts products={products} />;
}

async function PopularSection() {
  const res = await getProducts({ badge: "popular", limit: 14 });
  const products: Product[] = res?.data?.products ?? [];
  return <PopularProducts products={products} />;
}

// The shops a paid placement is lighting up. No placement running, no section:
// the rail would otherwise claim a "featured" list that is simply empty.
async function FeaturedStoresSection() {
  const result = asStoreList(await getPublicStores({ featured: true, limit: 8 }));
  const stores: PublicStore[] = result?.stores ?? [];
  return <FeaturedStores stores={stores} />;
}

// Reads the active "tile" banners. They are drawn two per row by PromoBanners.
async function PromoTilesSection() {
  const res = await getPromos({ isActive: "true", placement: "tile" });
  const banners: Promo[] = Array.isArray(res?.data)
    ? res.data
    : Array.isArray(res)
    ? res
    : [];

  return <PromoBanners banners={banners} />;
}

// The strip is a single band, so the first active "strip" banner wins
// (Promo always sorts by `order`, then newest first).
async function PromoStripSection() {
  const res = await getPromos({ isActive: "true", placement: "strip" });
  const banners: Promo[] = Array.isArray(res?.data)
    ? res.data
    : Array.isArray(res)
    ? res
    : [];

  return <PromoStrip strip={banners[0]} />;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Home() {
  return (
    <>
      {/* ── Hero Section: Left Docked Categories & Right-Shifted Slider ── */}
      <section className="w-full max-w-7xl mx-auto my-6 relative z-30">
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          <div className="hidden lg:block w-[270px] shrink-0 relative z-40">
            <CategoriesDropdown variant="docked" label="All Departments" />
          </div>
          <div className="flex-1 min-w-0 w-full relative z-10">
            <Suspense fallback={<HeroSlider />}>
              <HeroSliderSection />
            </Suspense>
          </div>
        </div>
      </section>

      <WarehouseDeals />

      {/* New Arrivals — shows skeleton while fetching */}
      <Suspense fallback={<NewArrivals loading />}>
        <NewArrivalsSection />
      </Suspense>

      {/* Promo tiles — the section disappears when no tile is active */}
      <Suspense fallback={null}>
        <PromoTilesSection />
      </Suspense>

      {/* Trending Products — shows skeleton while fetching */}
      <Suspense fallback={<TrendingProducts loading />}>
        <TrendingSection />
      </Suspense>

      {/* Popular Products — shows skeleton while fetching */}
      <Suspense fallback={<PopularProducts loading />}>
        <PopularSection />
      </Suspense>

      {/* Featured shops — disappears when no storefront placement is running */}
      <Suspense fallback={null}>
        <FeaturedStoresSection />
      </Suspense>

      {/* Wide promo strip — also disappears when no strip banner is active */}
      <Suspense fallback={null}>
        <PromoStripSection />
      </Suspense>

      <Brand />
    </>
  );
}
