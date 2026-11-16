/**
 * Traffic counting for the product pages.
 *
 * Two things get counted: a listing was opened (`view`) and a listing was
 * pressed to buy (`click`). The call is deliberately fire-and-forget — a
 * shopper never waits on it, a failure is swallowed, and a page that is already
 * navigating away still reports through `sendBeacon`.
 *
 * A view is remembered for the browser session, so refreshing a product does not
 * inflate it. A click is not: pressing buy twice is two presses.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL as string;

export type EngagementType = "view" | "click";

export function trackProductEngagement(productId: string, type: EngagementType): void {
  if (!productId || typeof window === "undefined" || !API_URL) return;

  if (type === "view") {
    const key = `sparq:engagement:view:${productId}`;
    try {
      if (window.sessionStorage.getItem(key)) return;
      window.sessionStorage.setItem(key, "1");
    } catch {
      // Private mode can refuse storage; the count is still worth sending.
    }
  }

  const url = `${API_URL}/engagement/products/${productId}`;
  const body = JSON.stringify({ type });

  try {
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      navigator.sendBeacon(url, new Blob([body], { type: "application/json" }));
      return;
    }
  } catch {
    // Fall through to fetch.
  }

  void fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {});
}
