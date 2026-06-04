import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";

const poppins = Poppins({ 
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"], // Inceden kalina tum font agirliklari
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: "Dalin Shopping | Premium Tracking",
  description: "Track your Dalin Shopping orders easily and securely.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${poppins.className} antialiased`}>
        {children}
      </body>
    </html>
  );
}