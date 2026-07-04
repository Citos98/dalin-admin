import "./globals.css";

export const metadata = {
  title: "Dalin Shopping - Order Tracking",
  description: "Track your Shein orders easily with Dalin Shopping.",
  openGraph: {
    title: "Dalin Shopping - Order Tracking",
    description: "Track your Shein orders easily with Dalin Shopping.",
    images: ["/logo.png"],
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
      <body>{children}</body>
    </html>
  );
}
