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
    <article className="w-full max-w-full sm:max-w-5xl mx-auto space-y-6 sm:space-y-8 md:space-y-10 text-left">
      {(headline || lastUpdated) && (
        <header className="space-y-2 sm:space-y-3 text-center">
          {headline && (
        <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 leading-tight break-words">
          {headline}
        </h1>
          )}
        {lastUpdated && (
          <p className="text-xs sm:text-sm text-gray-600 break-words">Last updated: {lastUpdated}</p>
        )}
      </header>
      )}

      <div className="divide-y divide-gray-200 border-y border-gray-200">
        {sections.map((s, i) => (
          <section key={i} className="py-4 sm:py-5 md:py-6 space-y-2 sm:space-y-3">
            <h2 className="text-xl sm:text-2xl md:text-2xl font-semibold text-gray-900 leading-snug break-words">
              {s.title}
            </h2>
            <div
              className="text-sm sm:text-base leading-relaxed sm:leading-[1.75] text-gray-800 space-y-3 sm:space-y-4 break-words terms-content"
              style={{ 
                textAlign: "justify",
                textJustify: "inter-word",
                wordBreak: "break-word",
                overflowWrap: "break-word",
                hyphens: "auto",
                maxWidth: "100%",
                boxSizing: "border-box"
              }}
            >
              {s.content}
            </div>
          </section>
        ))}
      </div>
    </article>
  );
}
