import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { Toaster } from "sonner";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/brand";

// Self-hosted (app/fonts/, OFL): the build never downloads from Google Fonts. Same CSS variables, latin
// subset, font-display swap and preload as the former next/font/google setup.
const jakartaSans = localFont({
  src: "./fonts/PlusJakartaSans-latin.woff2",
  variable: "--font-jakarta-sans",
  weight: "300 800",
  style: "normal",
  display: "swap",
});

const geistMono = localFont({
  src: "./fonts/GeistMono-latin.woff2",
  variable: "--font-geist-mono",
  weight: "100 900",
  style: "normal",
  display: "swap",
});

export const metadata: Metadata = {
  title: SITE_NAME,
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: {
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    siteName: SITE_NAME,
    locale: "id_ID",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            // Runs before hydration: sets the theme class on <html> only (suppressHydrationWarning
            // covers that one attribute). Components read the theme after mount (Phase 12, #418 fix).
            __html: `(function () {
  try {
    var theme = localStorage.getItem('theme');
    if (!theme) {
      theme = 'light';
      localStorage.setItem('theme', 'light');
    }
    document.documentElement.classList.toggle('dark', theme === 'dark');
  } catch (e) {}
})();`,
          }}
        />
      </head>
      <body
        className={`${jakartaSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          {children}
          {/* Site-wide toasts at the top centre (owner decision, Phase 13), below the 64 px navbar. The Jelajah
              pages move them below their own overlays through --toast-top (lib/jelajah/toast-clearance.ts). */}
          <Toaster
            richColors
            position="top-center"
            offset={{ top: "var(--toast-top, 72px)" }}
            mobileOffset={{ top: "var(--toast-top, 72px)" }}
          />
        </AuthProvider>

        
      </body>
    </html>
  );
}
