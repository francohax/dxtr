import "~/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";

import { TRPCReactProvider } from "~/trpc/react";
import { Nav } from "~/app/_components/Nav";

export const metadata: Metadata = {
  title: "dxtr — Pokémon Damage Calculator",
  description: "Simulate damage, OHKO odds, and type matchups at level 50.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={geist.variable}>
      <body>
        <TRPCReactProvider>
          <Nav />
          <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">{children}</main>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
