import type { Metadata } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const plex = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "OnDesk — what fits on the desk",
  description:
    "Pick a GPU or paste a Hugging Face repo. See what actually runs locally. Estimates, not benches.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={plex.className}>
        <div className="wrap">
          <header className="top">
            <Link href="/" className="brand">
              OnDesk
            </Link>
            <nav className="nav">
              <Link href="/">Fit</Link>
              <Link href="/about">Formulas</Link>
              <Link href="/digest">Digest</Link>
              <Link href="/settings">Settings</Link>
            </nav>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
