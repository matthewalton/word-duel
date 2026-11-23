import type { Metadata, Viewport } from "next";
import { Pixelify_Sans } from "next/font/google";
import { GAME_NAME } from "@/config/game";
import { UI_LANG } from "@/i18n/strings";
import "./globals.css";

const pixel = Pixelify_Sans({
  variable: "--font-pixel",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: GAME_NAME,
  description: `${GAME_NAME}: a tiny pixel word duel for vocabulary practice.`,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#2A2440",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang={UI_LANG} className={pixel.variable}>
      <body>{children}</body>
    </html>
  );
}
