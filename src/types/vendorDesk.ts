/** What the marketplace earns from its sellers, as the desk reads it. */
export interface VendorDeskTotals {
  /** Stores on the books. */
  vendors: number;
  /** Subscriptions that are live right now (active or in grace). */
  activePlans: number;
  /** Money actually collected for subscriptions in the window. */
  subscriptionIncome: number;
  /** What the live book is worth per month, yearly rows spread over 12. */
  monthlyRecurring: number;
  /** Gross sales rung up by sellers in the window. */
  vendorSales: number;
  vendorOrders: number;
  /** The store's cut of those sales, at each seller's own plan rate. */
  commissionEarned: number;
  /** Periods ending inside a week. */
  expiringSoon: number;
  /** Periods running on the plan's grace days. */
  inGrace: number;
}

export interface VendorDeskSeriesPoint {
  month: string;
  label: string;
  subscriptions: number;
  sales: number;
  commission: number;
}

export interface VendorDeskPlanRow {
  id: string;
  name: string;
  price: number;
  vendors: number;
  income: number;
}

export interface VendorDeskTopVendor {
  id: string;
  store: string;
  plan: string;
  sales: number;
  orders: number;
  commission: number;
}

export interface VendorDeskReport {
  months: number;
  totals: VendorDeskTotals;
  series: VendorDeskSeriesPoint[];
  plans: VendorDeskPlanRow[];
  topVendors: VendorDeskTopVendor[];
}
