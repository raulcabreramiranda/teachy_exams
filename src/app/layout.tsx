import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Teachy Exercise Lists",
  description: "Exercise list management for teachers and students.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
