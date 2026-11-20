import Link from "next/link";

export default function NotFound() {
  return (
    <div className="notice">
      <h1>Not found</h1>
      <p>We could not find what you were looking for.</p>
      <Link href="/" className="button">
        Back to the home page
      </Link>
    </div>
  );
}
