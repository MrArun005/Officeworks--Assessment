"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";

export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="notice notice--error" role="alert">
      <h1>We could not load the catalogue</h1>
      <p>This is usually temporary. Please try again.</p>
      <button type="button" className="button" onClick={() => retry()}>
        Try again
      </button>
    </div>
  );
}
