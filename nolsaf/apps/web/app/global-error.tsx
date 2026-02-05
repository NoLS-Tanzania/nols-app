"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <div style={{ padding: 24, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto" }}>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Something went wrong</h1>
          <p style={{ marginTop: 8, color: "#555" }}>
            {process.env.NODE_ENV === "development" ? error.message : "Please try again."}
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              marginTop: 12,
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid #ccc",
              background: "white",
              cursor: "pointer",
            }}
          >
            Retry
          </button>
        </div>
      </body>
    </html>
  );
}
