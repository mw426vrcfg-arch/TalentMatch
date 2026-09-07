import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import { Cormorant_Garamond, Plus_Jakarta_Sans } from "next/font/google";
import { AnalyticsProvider } from "@/components/analytics/analytics-provider";
import { I18nProvider } from "@/components/i18n/i18n-provider";
import { DEFAULT_LOCALE, LOCALE_STORAGE_KEY, htmlLang } from "@/lib/i18n/config";
import { translate } from "@/lib/i18n/messages";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-cormorant",
});

export const metadata: Metadata = {
  title: "TalentMatch",
  description: translate(DEFAULT_LOCALE, "home.metaDescription"),
};

const localeBootstrap = `try{var v=localStorage.getItem(${JSON.stringify(LOCALE_STORAGE_KEY)});if(v==="en"||v==="fr"||v==="de")document.documentElement.lang=v;}catch(e){}`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang={htmlLang(DEFAULT_LOCALE)} suppressHydrationWarning>
      <body className={`${plusJakarta.variable} ${cormorant.variable} min-h-screen font-sans text-ink antialiased`}>
        <script dangerouslySetInnerHTML={{ __html: localeBootstrap }} />
        <AnalyticsProvider>
          <I18nProvider>{children}</I18nProvider>
        </AnalyticsProvider>
        <Analytics />
      </body>
    </html>
  );
}
