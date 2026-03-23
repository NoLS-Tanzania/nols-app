import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Disbursement Policy",
  description:
    "NoLSAF's disbursement policy: how and when payments are released to property owners, drivers, and agents.",
  alternates: { canonical: "https://nolsaf.com/disbursement-policy" },
};

export { default } from "./DisbursementPolicyClient";
