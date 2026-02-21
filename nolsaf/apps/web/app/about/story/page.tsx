import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Our Best Story",
  description:
    "The story behind NoLSAF: building a connected travel experience where accommodation, transport, payments, and planning work together.",
};

export default function AboutStoryPage() {
  return (
    <article className="prose prose-slate max-w-none">
      <h2>Our Best Story</h2>
      <p>
        NoLSAF began with a simple truth: a stay can change how a person feels. When travel is stressful — confusing listings, uncertain
        transport, unclear costs, and complicated payments — people arrive tired before the trip even starts.
      </p>

      <p>
        We decided to build a platform that treats accommodation as part of the treatment: a calmer, clearer, more reliable path to rest.
        And we built it with the belief that booking is incomplete if transport and planning are separated from the stay.
      </p>

      <h3>What we’re building</h3>
      <ul>
        <li>
          A place where guests can book stays that match their budget <em>and</em> expectations — with less time filtering.
        </li>
        <li>
          A connected journey where accommodation, transport, and planning can happen in one platform.
        </li>
        <li>
          A payment experience that works for different regions: local and international options.
        </li>
        <li>
          A budget-friendly ecosystem: group stays that allow offers and owners to claim what fits.
        </li>
      </ul>

      <h3>Where we’re going</h3>
      <p>
        We’re committed to making NoLSAF a premium standard for booking across the region — trusted because it is accurate, helpful, and
        fair. The goal is simple and ambitious: <strong>quality stay for every wallet</strong>.
      </p>
    </article>
  );
}
