import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { Toaster } from "react-hot-toast";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "CertifyNow – Industry Ready Internship Certificates",
    template: "%s | CertifyNow",
  },
  description:
    "Industry-ready internships with real projects, mentor guidance and verifiable certificates.",
  keywords: [
    "online internships",
    "internship certificates",
    "student internships",
    "certified internships",
  ],
  metadataBase: new URL("https://certifynow.in"),
  openGraph: {
    title: "CertifyNow",
    description:
      "Learn by doing. Complete internships and earn verifiable certificates.",
    images: ["/og-image.png"],
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.className} antialiased bg-white text-slate-900`}
      >
        {/* Subtle background */}
        <div className="fixed inset-0 -z-10 bg-gradient-to-b from-slate-50 to-white" />

        <AuthProvider>
          <main className="min-h-screen">
            {children}
          </main>

          <Toaster
            position="top-right"
            toastOptions={{
              className:
                "bg-white text-slate-900 border border-slate-200 shadow-md",
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
