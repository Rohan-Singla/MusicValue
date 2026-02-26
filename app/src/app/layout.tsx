import type { Metadata } from "next";
import { SolanaProvider } from "@/providers/SolanaProvider";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Toaster } from "react-hot-toast";
import "./globals.css";
import { Poppins } from "next/font/google";

export const metadata: Metadata = {
  title: "MusicValue",
  description:
    "Back your favorite music tracks on Solana. Deposit USDC, earn yield, support artists.",
  openGraph: {
    title: "MusicValue",
    description: "Back your favorite music tracks and earn yield on Solana",
    type: "website",
  },
};


const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});



export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark`}>
      <body suppressHydrationWarning className={`min-h-screen bg-base text-slate-200 antialiased ${poppins.className}`}>
        <SolanaProvider>
          <div className="flex min-h-screen flex-col">
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: "#1a1a25",
                color: "#e2e8f0",
                border: "1px solid rgba(139, 92, 246, 0.2)",
                borderRadius: "12px",
              },
            }}
          />
        </SolanaProvider>
      </body>
    </html>
  );
}
