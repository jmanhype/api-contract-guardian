import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "API Contract Guardian — Catch Breaking API Changes Before Your Users Do",
  description:
    "Monitor any OpenAPI/Swagger spec for breaking changes. Get real-time Slack, webhook, and email alerts when upstream APIs break your integration.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-zinc-950 text-zinc-100 antialiased">
        {children}
      </body>
    </html>
  );
}
