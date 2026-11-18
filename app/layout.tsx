import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { Toaster } from "sonner";

const jakartaSans = Plus_Jakarta_Sans({
  variable: "--font-jakarta-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});


const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Nusantara Virtual",
  description: "Nusantara Virtual - Your gateway to Indonesian culture and entertainment",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
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
          <Toaster richColors position="top-right" />
        </AuthProvider>

        
      </body>
    </html>
  );
}
