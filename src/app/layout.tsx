import "~/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";

import { TRPCReactProvider } from "~/trpc/react";
import { SideNav } from "~/app/_components/SideNav";

export const metadata: Metadata = {
  title: "dxtr — Pokémon Damage Calculator",
  description: "Simulate damage, OHKO odds, and type matchups at level 50.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider>
      <html lang="en" className={geist.variable}>
        <body className="flex h-screen overflow-hidden bg-zinc-900 text-zinc-100">
          <TRPCReactProvider>
            <SideNav />
            <main className="flex-1 overflow-y-auto">
              {children}
            </main>
          </TRPCReactProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
