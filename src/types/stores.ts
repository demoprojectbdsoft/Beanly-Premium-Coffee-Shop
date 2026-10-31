// ─── Public Shops ────────────────────────────────────────────────────────────
// A seller's shop as a stranger sees it. This is deliberately not the shape
// the vendor's own desk reads: the seller's email, phone, exact street address
// and suspension note stay private, and the server's public DTO has no field
// for them. If a row here grows a contact detail, it should be a decision, not
// an accident.
export interface PublicStore {
  _id: string;
  name: string;
  slug: string;
  description: string;
  logo: string;
  coverImage: string;
  category: string;
  website: string;
  socialLinks: {
    facebook: string;
    instagram: string;
    x: string;
    linkedin: string;
  };
  address: {
    country: string;
    division: string;
    city: string;
    area: string;
  };
  /** The paid storefront placement is running right now. */
  isFeatured: boolean;
  productCount: number;
  reviewCount: number;
  rating: number;
  completedOrders: number;
  createdAt: string;
}

export interface PublicStoreListResult {
  stores: PublicStore[];
  total: number;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
