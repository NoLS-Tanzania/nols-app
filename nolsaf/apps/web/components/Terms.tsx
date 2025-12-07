"use client";
import React from "react";

export type TermsSection = {
  title: string;
  content: React.ReactNode;
};

type Props = {
  headline?: string;
  lastUpdated?: string;
  sections: TermsSection[];
};

export default function Terms({ headline = "Terms of Service", lastUpdated, sections }: Props) {
  return (
    <article className="prose max-w-none">
      <header>
        <h1>{headline}</h1>
        {lastUpdated && (
          <p className="text-sm text-gray-600">Last updated: {lastUpdated}</p>
        )}
      </header>
      {sections.map((s, i) => (
        <section key={i}>
          <h2>{s.title}</h2>
          <div>{s.content}</div>
        </section>
      ))}
    </article>
  );
}
