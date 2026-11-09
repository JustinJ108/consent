import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Consent Hub",
  description:
    "Share social-service client information across organizations with explicit, revocable, audited client consent.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
