import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Cormorant_Garamond, Plus_Jakarta_Sans } from "next/font/google";
import { I18nProvider } from "@/components/i18n/i18n-provider";
import { LOCALE_COOKIE, htmlLang, parseLocale } from "@/lib/i18n/config";
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

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const locale = parseLocale(cookieStore.get(LOCALE_COOKIE)?.value);
  return {
    title: "TalentMatch",
    description: translate(locale, "home.metaDescription"),
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const locale = parseLocale(cookieStore.get(LOCALE_COOKIE)?.value);

  return (
    <html lang={htmlLang(locale)} suppressHydrationWarning>
      <body className={`${plusJakarta.variable} ${cormorant.variable} min-h-screen font-sans text-ink antialiased`}>
        <I18nProvider initialLocale={locale}>{children}</I18nProvider>
      </body>
    </html>
  );
}
