import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Suspense } from 'react';

// 1. IMPORT SATPAM LATAR BELAKANG
import AutoLogout from "@/components/AutoLogout";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Keuangan Dika",
  description: "Aplikasi pencatatan keuangan pribadi canggih berbasis AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
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