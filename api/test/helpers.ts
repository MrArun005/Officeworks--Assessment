import type { ProductSource } from "../src/catalogue/productSource.js";
import { slugify, type Product } from "../src/domain/product.js";
import type { EmailMessage, EmailSender } from "../src/email/emailSender.js";

export function product(
  id: string,
  overrides: Partial<Omit<Product, "category">> & { category?: string } = {},
): Product {
  const { category = "electronics", ...rest } = overrides;
  return {
    id,
    title: `Product ${id}`,
    description: `Description of product ${id}`,
    price: 10,
    currency: "USD",
    imageUrl: `https://img.test/${id}.png`,
    rating: { average: 3, count: 10 },
    ...rest,
    category: { slug: slugify(category), name: category },
  };
}

export class StubProductSource implements ProductSource {
  calls = 0;
  error?: Error;

  constructor(public products: Product[]) {}

  async getAll(): Promise<Product[]> {
    this.calls += 1;
    if (this.error) throw this.error;
    return this.products;
  }
}

export class RecordingEmailSender implements EmailSender {
  sent: EmailMessage[] = [];
  error?: Error;

  async send(message: EmailMessage): Promise<void> {
    if (this.error) throw this.error;
    this.sent.push(message);
  }
}
