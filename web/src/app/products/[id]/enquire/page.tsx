import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { submitEnquiry } from "@/app/actions";
import { EnquiryForm } from "@/components/EnquiryForm";
import { getProduct } from "@/lib/api";
import { formatCategoryName, formatPrice } from "@/lib/format";

export const metadata: Metadata = { title: "Enquire" };

type Params = Promise<{ id: string }>;

async function Enquiry({ params }: { params: Params }) {
  const { id } = await params;
  const product = await getProduct(id);

  return (
    <div className="enquiry">
      <div className="enquiry__intro">
        <p className="enquiry__back">
          <Link href={`/products/${encodeURIComponent(product.id)}`}>← Back to product</Link>
        </p>
        <p className="eyebrow">Enquiry</p>
        <h1>Enquire about this product</h1>
        <p className="lead">Leave your details and our sales team will be in touch.</p>
        {/* What the enquiry is about, so the customer can check before sending. */}
        <div className="summary">
          <span className="summary__media">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="summary__image" src={product.imageUrl} alt="" />
          </span>
          <p className="summary__text">
            <span className="card__category">{formatCategoryName(product.category.name)}</span>
            <span className="summary__title">{product.title}</span>
            <span className="summary__price">{formatPrice(product.price, product.currency)}</span>
          </p>
        </div>
      </div>
      <div className="panel">
        {/* The product id is bound to the action rather than kept in a form
            field. It still travels in the request, so the API re-checks it. */}
        <EnquiryForm
          productTitle={product.title}
          action={submitEnquiry.bind(null, product.id)}
          onward={
            <Link href="/" className="button">
              Continue browsing
            </Link>
          }
        />
      </div>
    </div>
  );
}

export default function EnquirePage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<p className="lead">Loading…</p>}>
      <Enquiry params={params} />
    </Suspense>
  );
}
