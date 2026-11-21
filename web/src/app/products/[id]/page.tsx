import type { Metadata } from "next";
import Link from "next/link";
import { cache, Suspense } from "react";
import { Rating } from "@/components/ProductGrid";
import { getProduct } from "@/lib/api";
import { formatCategoryName, formatPrice } from "@/lib/format";

type Params = Promise<{ id: string }>;

/** The page title and the page body share one API call per request. */
const loadProduct = cache(getProduct);

/** Each product page gets its own title, which is also what the route announcer reads. */
export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const product = await loadProduct(id);
  return { title: product.title, description: product.description.slice(0, 160) };
}

async function ProductDetails({ params }: { params: Params }) {
  const { id } = await params;
  const product = await loadProduct(id);

  return (
    <article className="product">
      <div className="product__media">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="product__image" src={product.imageUrl} alt={product.title} />
      </div>
      <div className="product__body">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <span aria-hidden="true">/</span>
          <Link href={`/categories/${product.category.slug}`}>
            {formatCategoryName(product.category.name)}
          </Link>
        </nav>
        <h1 className="product__title">{product.title}</h1>
        <Rating rating={product.rating} />
        <p className="product__price">{formatPrice(product.price, product.currency)}</p>
        <p className="product__description">{product.description}</p>
        <div className="product__actions">
          <Link
            href={`/products/${encodeURIComponent(product.id)}/enquire`}
            className="button button--large"
          >
            Enquire
          </Link>
          <p className="product__note">
            Have a question about this product? Our sales team will get back to you.
          </p>
        </div>
      </div>
    </article>
  );
}

export default function ProductPage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<p className="lead">Loading product…</p>}>
      <ProductDetails params={params} />
    </Suspense>
  );
}
