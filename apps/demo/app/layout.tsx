import type { Metadata, Viewport } from "next";
import { Urbanist } from "next/font/google";
import "./globals.css";

const sans = Urbanist({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Talk2Buy",
  description: "Order food and groceries from local Nigerian shops by chatting, in English or Pidgin.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

// Runs before first paint so a saved light theme doesn't flash dark.
const THEME_SCRIPT = `try{if(localStorage.getItem("theme")==="light")document.documentElement.dataset.theme="light"}catch{}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // The script may set data-theme before React hydrates.
    <html lang="en" className={sans.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
