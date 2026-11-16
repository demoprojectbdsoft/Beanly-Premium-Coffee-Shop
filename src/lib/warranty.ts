// ─── Warranty wording shared by the product screens ─────────────────────────
// The server stores short codes; these options turn them into readable text so
// the add, edit and detail screens describe a warranty the same way.

/**
 * Every warranty type the server can store, with the words the product forms use.
 * Kept in step with `warranty.types.ts` on the server, so the store never
 * promises one thing in a form and another thing on the product page.
 */
export const WARRANTY_TYPE_OPTIONS = [
  {
    value: "manufacturer-warranty",
    label: "Manufacturer warranty",
    short: "Manufacturer",
    customerAction: "Covered by the brand's own service centre for the period below.",
    hasCoverage: true,
  },
  {
    value: "seller-warranty",
    label: "Seller warranty",
    short: "Seller",
    customerAction: "Covered by this store, which repairs or replaces the item itself.",
    hasCoverage: true,
  },
  {
    value: "extended-warranty",
    label: "Extended warranty",
    short: "Extended",
    customerAction: "Covered by this store under the extended plan, past the usual period.",
    hasCoverage: true,
  },
  {
    value: "other",
    label: "Other warranty",
    short: "Other",
    customerAction: "Covered exactly as written in the terms below.",
    hasCoverage: true,
  },
  {
    value: "none",
    label: "No warranty",
    short: "No warranty",
    customerAction: "Sold without warranty, so no coverage applies to this item.",
    hasCoverage: false,
  },
] as const;

export type WarrantyTypeValue = (typeof WARRANTY_TYPE_OPTIONS)[number]["value"];

export type WarrantyTypeInfo = (typeof WARRANTY_TYPE_OPTIONS)[number];
