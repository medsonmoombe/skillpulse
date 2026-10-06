import type { Metadata } from "next";
import { Geist, Geist_Mono, DM_Sans, Playfair_Display } from "next/font/google";
import "./globals.css";
import "@excalidraw/excalidraw/index.css";
import { ClerkProvider } from "@clerk/nextjs";
import { LiveblocksProviderWrapper } from "@/components/LiveblocksProviderWrapper";
import { ToastProvider } from "@/components/ui/toast-provider";
import { ThemeProvider } from "@/components/ThemeProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "900"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["700", "900"],
});

export const metadata: Metadata = {
  title: "SkillPulse",
  description: "Connect with world-class experts",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${geistSans.variable} ${geistMono.variable} ${dmSans.variable} ${playfair.variable} h-full antialiased`}
        suppressHydrationWarning
      >
        <body className="min-h-full flex flex-col">
          <ThemeProvider>
            <ToastProvider>
              <LiveblocksProviderWrapper>{children}</LiveblocksProviderWrapper>
            </ToastProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
