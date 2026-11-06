import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Suspense } from "react";

// 1. IMPORT SATPAM LATAR BELAKANG
import AutoLogout from "@/components/AutoLogout";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Keuangan Dika",
  description: "Aplikasi pencatatan keuangan pribadi canggih berbasis AI",
};

const skripTema = `(function(){try{var t=localStorage.getItem("tema");if(t==="gelap"){document.documentElement.classList.add("dark")}else{document.documentElement.classList.remove("dark")}}catch(e){}})()`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: skripTema }} />
      </head>
      <body className={inter.className}>
        {/* 2. AKTIFKAN SATPAM DI SINI (Dibungkus Suspense agar Vercel lolos) */}
        <Suspense fallback={null}>
          <AutoLogout />
        </Suspense>

        {children}
      </body>
    </html>
  );
}
