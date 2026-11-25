import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Self-hosted, Latin-subset brand fonts (SIL OFL, see ./fonts): small on 3G and no
// build-time fetch from Google.
const inter = localFont({
  src: "./fonts/Inter-latin.woff2",
  variable: "--font-inter",
  weight: "400 700",
  display: "swap",
});

const bricolage = localFont({
  src: "./fonts/BricolageGrotesque-latin.woff2",
  variable: "--font-bricolage",
  weight: "600 800",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Memba",
  description: "Remind customers who owe you money, and record what they pay.",
  applicationName: "Memba",
  appleWebApp: { capable: true, title: "Memba", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#F6F4EE",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${bricolage.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
