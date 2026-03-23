import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Help Centre",
  description:
    "Find answers to your questions about booking accommodation, transport, payments, and using the NoLSAF platform.",
  alternates: { canonical: "https://nolsaf.com/help" },
};

export { default } from "./HelpClient";
