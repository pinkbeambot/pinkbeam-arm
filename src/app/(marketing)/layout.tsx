import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pink Beam ARM | AI Employees for Your Business",
  description: "Run a 50-person company as a 1-person founder. Hire AI employees for research, sales, support, and creative work. One platform. One price. Infinite output.",
  keywords: ["AI employees", "autonomous agents", "AI workforce", "agent relationship management", "AI agents for business"],
  authors: [{ name: "Pink Beam" }],
  creator: "Pink Beam",
  publisher: "Pink Beam",
  metadataBase: new URL("https://pinkbeam.io"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://pinkbeam.io",
    siteName: "Pink Beam ARM",
    title: "Pink Beam ARM | AI Employees for Your Business",
    description: "Run a 50-person company as a 1-person founder. Hire AI employees for research, sales, support, and creative work.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Pink Beam ARM - AI Employees Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Pink Beam ARM | AI Employees for Your Business",
    description: "Run a 50-person company as a 1-person founder. Hire AI employees for research, sales, support, and creative work.",
    images: ["/og-image.png"],
    creator: "@pinkbeam",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "google-site-verification-code",
  },
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  );
}
