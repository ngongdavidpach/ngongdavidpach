import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Junub Pay — Diaspora remittance & bill pay for South Sudan",
  description:
    "Pay school fees, medical bills and utilities directly to providers back home. A secure remittance corridor that undercuts Western Union and keeps funds safe.",
  metadataBase: new URL("https://junubpay.ss"),
  openGraph: {
    title: "Junub Pay",
    description:
      "Send money home the smart way. Pay bills directly — school fees, medical, utilities — across the South Sudan remittance corridor.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
