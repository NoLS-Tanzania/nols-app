import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Why us",
  description:
    "Why choose NoLSAF: end-to-end travel (accommodation + transport + payments + planning) with verification and a budget-friendly approach.",
};

export default function AboutWhyPage() {
  return (
    <article className="prose prose-slate max-w-none">
      <h2>Why us</h2>
      <p>
        NoLSAF is designed to make travel feel connected and predictable. We reduce uncertainty through verification, simplify choices
        through smart organization, and support the journey beyond the booking.
      </p>

      <h3>End-to-end, not fragmented</h3>
      <p>
        We don’t treat accommodation as an isolated transaction. The complete experience includes getting to the destination and knowing
        what to expect. NoLSAF brings these pieces together so users can engage in one platform.
      </p>

      <h3>Payment flexibility for different regions</h3>
      <p>
        We built NoLSAF to support both local and international payment methods. Users choose what matches their location and preference,
        which increases accessibility and reduces booking friction.
      </p>

      <h3>Faster discovery: less time filtering</h3>
      <p>
        We structure the experience so travelers don’t spend hours filtering. We focus on making it easy to navigate from towns to
        tourist sites and quickly find what fits.
      </p>

      <h3>Budget-friendly mechanisms that expand access</h3>
      <ul>
        <li>
          <strong>Group Stay offers:</strong> guests can submit offers and owners can claim offers that fit.
        </li>
        <li>
          <strong>Plan with Us:</strong> guidance and coordination for destinations where travelers need more information.
        </li>
        <li>
          <strong>Agent and event collaboration:</strong> systems that support both clients and partners.
        </li>
      </ul>

      <h3>Rest and well-being as a real outcome</h3>
      <p>
        We believe sleep is therapy. By reducing stress in planning and booking, we help travelers arrive ready to rest and recover — and
        we help hosts deliver the kind of experience that keeps guests coming back.
      </p>
    </article>
  );
}
