/**
 * Keeps the three pricing fields (selling price, original price, discount %)
 * consistent while the admin types.
 *
 * A deal can be driven from any two of them, so whichever field was last
 * touched is treated as the source and the dependent one is recomputed:
 * - price or original price changes  -> the discount percentage follows
 * - discount percentage changes       -> the selling price follows from the
 *   original price; when no original price is set yet, the original price
 *   follows from the selling price instead
 *
 * Values stay as the strings the number inputs hold, so callers can spread the
 * result straight back into their form state.
 */
export type PricingField = "price" | "originalPrice" | "discountPercentage";

export interface PricingValues {
  price: string;
  originalPrice: string;
  discountPercentage: string;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function recalcPricing(values: PricingValues, changed: PricingField): PricingValues {
  const price = parseFloat(values.price);
  const originalPrice = parseFloat(values.originalPrice);
  const discount = parseFloat(values.discountPercentage);

  if (changed === "discountPercentage") {
    // A discount outside (0, 100) can't drive a price; leave the fields as typed.
    if (isNaN(discount) || discount < 0 || discount >= 100) return values;

    // Original price known -> derive the selling price.
    if (!isNaN(originalPrice) && originalPrice > 0) {
      return { ...values, price: String(round2(originalPrice * (1 - discount / 100))) };
    }
    // Only the selling price known -> derive the original price.
    if (!isNaN(price) && price > 0) {
      return { ...values, originalPrice: String(round2(price / (1 - discount / 100))) };
    }
    return values;
  }

  // Price or original price changed -> recompute the discount percentage.
  const newDiscount =
    !isNaN(price) && price > 0 && !isNaN(originalPrice) && originalPrice > price
      ? String(Math.round(((originalPrice - price) / originalPrice) * 100))
      : "";
  return { ...values, discountPercentage: newDiscount };
}
