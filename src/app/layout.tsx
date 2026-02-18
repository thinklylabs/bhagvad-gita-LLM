import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Gita AI - Ask the Bhagavad Gita",
  description: "Ask anything about the Bhagavad Gita. Get answers grounded in the sacred text, with quotes from shlokas and verses. Explore dharma, karma, the self, and the teachings of Krishna and Arjuna.",
  keywords: ["Bhagavad Gita", "Gita", "Hinduism", "spirituality", "dharma", "karma", "Krishna", "Arjuna", "AI assistant", "sacred text"],
  authors: [{ name: "Gita AI" }],
  openGraph: {
    title: "Gita AI - Ask the Bhagavad Gita",
    description: "Ask anything about the Bhagavad Gita. Get answers grounded in the sacred text, with quotes from shlokas and verses.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Gita AI - Ask the Bhagavad Gita",
    description: "Ask anything about the Bhagavad Gita. Get answers grounded in the sacred text.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-stone-950 min-h-screen">
        <Navbar />
        {children}
      </body>
    </html>
  );
}
