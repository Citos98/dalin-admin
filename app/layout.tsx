import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";

const poppins = Poppins({ 
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"], // Inceden kalina tum font agirliklari
  variable: "--font-poppins",
});

export const metadata = {
  title: "Dalin Shopping - Order Tracking",
  description: "Track your Shein orders easily with Dalin Shopping.",
  openGraph: {
    title: "Dalin Shopping - Order Tracking",
    description: "Track your Shein orders easily with Dalin Shopping.",
    images: ["/logo.png"], // Sitenin public klasöründe logo.png adında bir fotoğraf olduğundan emin ol
    type: "website",
  },
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