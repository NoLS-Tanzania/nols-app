import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Who are we",
  description:
    "Who we are at NoLSAF: a verification-first, end-to-end travel platform for accommodation, transport, payments, and planning — built to deliver quality stay for every wallet.",
};

export default function AboutWhoPage() {
  return (
    <article className="prose prose-slate max-w-none">
      <h2>Who are we</h2>
      <p>
        NoLSAF is an end-to-end travel platform built around one promise: <strong>Quality stay for every wallet</strong>. We treat
        accommodation as more than a listing — it’s a form of recovery, comfort, and stability. In that sense, a good stay is not just a
        room; it’s part of a traveler’s well-being.
      </p>

      <p>
        That is why we focus on trust, clarity, and a smooth journey from discovery to arrival — combining verified accommodation,
        transport coordination, flexible payments, and planning support in one platform.
      </p>

      <h3>Why we exist</h3>
      <p>
        Booking a stay often feels fragmented: you search for accommodation, then separately figure out how to get there, how to pay, what
        the area costs, and what to do after arrival. NoLSAF exists to reduce that friction and turn travel into a single, connected
        experience.
      </p>

      <h3>What we stand for</h3>
      <ul>
        <li>
          <strong>Trust and verification:</strong> accurate listings, clear expectations, and a consistent booking experience.
        </li>
        <li>
          <strong>Budgetary freedom:</strong> choices that fit different budgets without leaving anyone behind.
        </li>
        <li>
          <strong>Local expertise:</strong> built for the realities of local travel and local markets.
        </li>
        <li>
          <strong>Support that shows up:</strong> planning and assistance that helps travelers make confident decisions.
        </li>
      </ul>

      <h3>Who we serve</h3>
      <p>
        We serve solo travelers, families, and groups looking for safe and affordable stays — plus property owners, agents, and event
        partners who want a reliable system that connects travelers with real-world services.
      </p>

      <h3>Our belief: sleep is therapy</h3>
      <p>
        We take rest seriously. Sleeping is not only “closing eyes” — it is a form of therapy that restores energy, focus, and emotional
        stability. NoLSAF is designed to help society regain that energy by making it easier to find the right stay, in the right place,
        with less stress and fewer surprises.
      </p>
    </article>
  );
}
