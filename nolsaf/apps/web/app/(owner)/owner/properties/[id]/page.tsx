"use client";
import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

/**
 * /owner/properties/[id]  →  /owner/properties/add?id=[id]
 *
 * There is no standalone property-detail page. The add/edit form lives at
 * /owner/properties/add and accepts an `id` query param to load an existing
 * property. This page catches any direct or linked navigation to
 * /owner/properties/:id and redirects to the correct destination.
 */
export default function PropertyDetailRedirect() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  useEffect(() => {
    const id = Array.isArray(params?.id) ? params.id[0] : params?.id;
    if (id) {
      router.replace(`/owner/properties/add?id=${id}`);
    } else {
      router.replace("/owner/properties/pending");
    }
  }, [params, router]);

  return null;
}
