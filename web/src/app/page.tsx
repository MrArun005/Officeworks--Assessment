import { Suspense } from "react";
import { ProductGrid, ProductGridSkeleton } from "@/components/ProductGrid";
import { ViewToggle } from "@/components/ViewToggle";
import { getFeaturedProducts } from "@/lib/api";

async function FeaturedProducts() {
  const products = await getFeaturedProducts();
  return <ProductGrid products={products} layout="showcase" label="Top rated products" />;
}

export default function HomePage() {
  return (
    <div className="home">
      <header className="hero">
        <p className="eyebrow">Our pick of the catalogue</p>
        <h1 className="hero__title">Top rated</h1>
        <ViewToggle />
      </header>
      {/* How many, and which, is decided by the API, not here. */}
      <Suspense fallback={<ProductGridSkeleton count={5} layout="showcase" />}>
        <FeaturedProducts />
      </Suspense>
    </div>
  );
}
