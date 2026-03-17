import type { Metadata } from "next";
import type { ReactNode } from "react";

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://nolsaf.com";

type Props = {
  params: Promise<{ slug: string }>;
  children: ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;

  try {
    const apiBase =
      process.env.API_ORIGIN ||
      process.env.NEXT_PUBLIC_API_URL ||
      "http://localhost:4000";

    const res = await fetch(
      `${apiBase}/api/public/properties/${encodeURIComponent(slug)}`,
      { next: { revalidate: 3600 } }
    );

    if (!res.ok) throw new Error("not found");

    const json = await res.json();
    const property = json?.property ?? json;

    if (!property?.title) throw new Error("no title");

    const title = property.title as string;
    const description: string =
      (property.description as string | null) ||
      [
        property.type,
        property.city || property.district,
        property.regionName,
        property.country,
      ]
        .filter(Boolean)
        .join(", ") ||
      "Verified accommodation on NoLSAF";

    const location = [
      property.city || property.district,
      property.regionName,
    ]
      .filter(Boolean)
      .join(", ");

    const pageTitle = location ? `${title} — ${location}` : title;
    const ogImage = (property.images as string[])?.[0];
    const canonicalUrl = `${SITE_URL}/public/properties/${slug}`;

    return {
      title: pageTitle,
      description: description.slice(0, 160),
      alternates: { canonical: canonicalUrl },
      openGraph: {
        title: pageTitle,
        description: description.slice(0, 160),
        url: canonicalUrl,
        type: "website",
        ...(ogImage
          ? { images: [{ url: ogImage, width: 1200, height: 800, alt: title }] }
          : {}),
      },
      twitter: {
        card: "summary_large_image",
        title: pageTitle,
        description: description.slice(0, 160),
        ...(ogImage ? { images: [ogImage] } : {}),
      },
    };
  } catch {
    return {
      title: "Property Details",
      description: "View property details, availability, and book your stay on NoLSAF.",
    };
  }
}

export default function PropertySlugLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
