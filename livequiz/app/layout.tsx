import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LiveQuiz",
  description: "Kuis live real-time untuk pembelajaran",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body className="antialiased">{children}</body>
    </html>
  );
}