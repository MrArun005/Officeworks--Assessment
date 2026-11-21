/**
 * The API contract as the client sees it. Kept by hand for the PoC; the next
 * step is generating this from an OpenAPI description owned by the API.
 */
export interface Category {
  slug: string;
  name: string;
}

export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  /** ISO 4217 code, e.g. "USD". */
  currency: string;
  category: Category;
  imageUrl: string;
  rating: { average: number; count: number };
}

export interface CategoryListing {
  category: Category;
  topRated: Product[];
  others: Product[];
}

export interface EnquiryInput {
  productId: string;
  name: string;
  email: string;
  phone?: string;
  message?: string;
}
