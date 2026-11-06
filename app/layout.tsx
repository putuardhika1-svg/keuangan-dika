import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Newsreader } from "next/font/google";
import "./globals.css";
import { Suspense } from "react";

import AutoLogout from "@/components/AutoLogout";

const sans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-sans",
  display: "swap",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
});

const serif = Newsreader({
  subsets: ["latin"],
  weight: ["400", "500"],
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
