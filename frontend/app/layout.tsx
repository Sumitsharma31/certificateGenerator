import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { Toaster } from "react-hot-toast";


const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Online Internship Platform",
  description: "Platform for internships with verifiable certificates",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${inter.className} relative min-h-screen bg-slate-50 overflow-x-hidden`}
      >


        {/* Main Content */}
        <div className="relative z-10 min-h-screen">
          <AuthProvider>
            {children}
            <Toaster position="top-right" />
          </AuthProvider>
        </div>
      </body>
    </html>
  );
}
