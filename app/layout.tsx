import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Suspense } from "react";

import AutoLogout from "@/components/AutoLogout";

const sans = localFont({
  src: [
    { path: "./fonts/ibm-plex-sans-latin.woff2", weight: "400 600", style: "normal" },
  ],
  variable: "--font-plex-sans",
  display: "swap",
});

const mono = localFont({
  src: [
    { path: "./fonts/ibm-plex-mono-400-latin.woff2", weight: "400", style: "normal" },
    { path: "./fonts/ibm-plex-mono-500-latin.woff2", weight: "500", style: "normal" },
  ],
  variable: "--font-plex-mono",
  display: "swap",
});

const serif = localFont({
  src: [
    { path: "./fonts/newsreader-latin.woff2", weight: "400 500", style: "normal" },
  ],
  variable: "--font-newsreader",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Buku Kas — Keuangan Pribadi",
  description: "Buku kas pribadi untuk mencatat pemasukan, pengeluaran, dan anggaran bulanan.",
};

const skripTema = `(function(){try{var t=localStorage.getItem("tema");if(t==="gelap"){document.documentElement.classList.add("dark")}else{document.documentElement.classList.remove("dark")}}catch(e){}})()`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${sans.variable} ${mono.variable} ${serif.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: skripTema }} />
      </head>
      <body className={`${sans.className} bg-paper text-ink antialiased`}>
        <Suspense fallback={null}>
          <AutoLogout />
        </Suspense>

        {children}
      </body>
    </html>
  );
}
