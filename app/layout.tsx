import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { EmailNotVerifiedNotice } from "@/components/auth/local/EmailNotVerifiedNotice";
import { Toaster } from "sonner";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/brand";

// Self-hosted (app/fonts/, OFL, sources in app/fonts/README.md): the build never downloads from Google Fonts.
// Phase 27 visual identity: Poppins for body and UI (400, 500, 600, 700, latin subset), Cinzel Decorative only for the
// logotype and a few large display headings (`font-display`), Geist Mono where mono is used. font-display swap.
const poppins = localFont({
  src: [
    { path: "./fonts/Poppins-Regular-latin.woff2", weight: "400", style: "normal" },
    { path: "./fonts/Poppins-Medium-latin.woff2", weight: "500", style: "normal" },
    { path: "./fonts/Poppins-SemiBold-latin.woff2", weight: "600", style: "normal" },
    { path: "./fonts/Poppins-Bold-latin.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-poppins",
  display: "swap",
  fallback: ["Arial", "Helvetica", "sans-serif"],
});

const cinzelDecorative = localFont({
  src: "./fonts/CinzelDecorative-Bold.woff2",
  variable: "--font-cinzel-decorative",
  weight: "700",
  style: "normal",
  display: "swap",
  fallback: ["Georgia", "serif"],
});

const geistMono = localFont({
  src: "./fonts/GeistMono-latin.woff2",
  variable: "--font-geist-mono",
  weight: "100 900",
  style: "normal",
  display: "swap",
});

export const metadata: Metadata = {
  // The single product domain (Phase 10); makes the Open Graph image URL absolute (app/opengraph-image.png, Phase 27).
  metadataBase: new URL("https://nusantaralegacy.org"),
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
  twitter: { card: "summary_large_image", title: SITE_NAME, description: SITE_DESCRIPTION },
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
        className={`${poppins.variable} ${cinzelDecorative.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          {children}
          {/* Phase 29: local login only (403 EMAIL_NOT_VERIFIED notice with resend). */}
          {process.env.NEXT_PUBLIC_AUTH_MODE === "local" && <EmailNotVerifiedNotice />}
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
