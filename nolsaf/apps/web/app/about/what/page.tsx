import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "What we do",
  description:
    "What NoLSAF does: end-to-end travel services that connect accommodation, transport, payments, filtering, and planning in one platform.",
};

export default function AboutWhatPage() {
  return (
    <article className="prose prose-slate max-w-none">
      <h2>What we do</h2>
      <p>
        NoLSAF provides end-to-end services that make travel feel simple: choose a place to stay, plan how to reach it, pay using the
        method that fits your location, and get support for the experience around the stay.
      </p>

      <h3>1) Accommodation search treated as a “service”</h3>
      <p>
        We treat searching for accommodation as part of the treatment — the process should be calm, fast, and confidence-building.
        Filtering should not take hours. We structure discovery so travelers can quickly find what fits.
      </p>

      <h3>2) End-to-end travel in one platform</h3>
      <p>
        We believe booking is incomplete if transport is separated from accommodation. That’s why NoLSAF supports an integrated journey
        from planning to arrival — so travelers can engage on a “single click” experience rather than juggling disconnected tools.
      </p>

      <h3>3) Payments that work locally and internationally</h3>
      <p>
        Travelers come from different places and use different payment methods. NoLSAF is built to support both local and international
        payment options, so users can choose what works for them.
      </p>

      <h3>4) Town-to-tourist-site friendly discovery</h3>
      <p>
        We classify and present stays in a way that is easy to navigate — from town stays to tourist-site destinations — so users can move
        from “where am I going?” to “what should I book?” without confusion.
      </p>

      <h3>5) Planning support for solo travelers (“Plan with Us”)</h3>
      <ul>
        <li>
          Help for travelers who have a destination in mind but insufficient information about cost, timing, and what matters most.
        </li>
        <li>
          Guidance for visits to places like Serengeti, Zanzibar, or similar destinations — so travelers can plan with confidence.
        </li>
        <li>
          Linked services in one place: <strong>transport + accommodation + tourist-site planning</strong>.
        </li>
      </ul>

      <h3>6) Group Stays: budget-friendly offers with owner claiming</h3>
      <p>
        For certain circumstances, we support a group-stay flow where travelers can submit offers and property owners can claim offers
        that fit them. This approach helps expand access and supports budget-friendly travel across the region.
      </p>

      <h3>7) Agents and event managers</h3>
      <p>
        Travel is not only about visiting towns — many travelers come for traditional tourism and need clarity on arrangements, budgets,
        timing, and what to prioritize. Our agent system is designed to make that easy and structured.
      </p>

      <p>
        On NoLSAF, travelers can request support and get coordinated guidance from agents and event managers — including destination
        information, budget expectations, and recommended arrangements — then connect those plans to real bookings.
      </p>

      <ul>
        <li>
          <strong>Arrangements and coordination:</strong> help organizing accommodation, transport, and key activities as one journey.
        </li>
        <li>
          <strong>Budget clarity:</strong> guidance on expected costs and options so travelers can choose what fits their wallet.
        </li>
        <li>
          <strong>Local insight:</strong> practical information about destinations so visitors can plan confidently.
        </li>
        <li>
          <strong>Partner-friendly workflow:</strong> a system that helps agents turn planning into confirmed bookings and support clients
          end-to-end.
        </li>
      </ul>
    </article>
  );
}
